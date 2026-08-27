import { test, expect, type Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { PORTS } from '../ports';

/**
 * Nothing may reach the Plone API during a non-Plone run.
 *
 * The whole point of the inversion is that the admin holds no CMS of its own:
 * every call travels admin -> bridge -> iframe adapter -> that site's CMS. A
 * request to the Plone mock during a Drupal or WordPress run means something
 * bypassed the bridge, and it is a bug whether or not the page still renders —
 * on a real WordPress site that host does not exist at all.
 *
 * This is an assertion, not a warning. Drupal's contract suite was green for
 * hours while the editor could not load a page against it, because five layers
 * between the admin and the adapter were still Plone-shaped and nothing failed
 * when they spoke to the wrong server.
 */
function forbidPloneApi(page: Page, projectName: string): string[] {
  const offenders: string[] = [];
  if (projectName === 'journey-plone') return offenders;

  const ploneOrigins = [
    `localhost:${PORTS.mockApi}`,
    `127.0.0.1:${PORTS.mockApi}`,
  ];
  page.on('request', (request) => {
    const url = request.url();
    if (ploneOrigins.some((origin) => url.includes(origin))) {
      offenders.push(`${request.method()} ${url}`);
    }
  });
  return offenders;
}

/**
 * The editor journey, run unchanged against every CMS.
 *
 * Create a page, link it to another by browsing, then move it.
 *
 * ONE test, not three. The steps share a session by necessity: the mocks
 * scope content to the caller's token so parallel tests cannot corrupt each
 * other, which means a page created in one test simply does not exist in the
 * next. It is also what "a journey" means — an editor does not log in again
 * between steps.
 *
 * Written with no per-CMS branches. If it ever needs one, the abstraction has
 * leaked and that is the finding. The adapter is chosen by the FRONTEND via
 * ?adapter=; the admin is byte-identical across all three runs, which is the
 * claim under test.
 */

const STAMP = Date.now();
const TITLE = `Journey ${STAMP}`;

/**
 * WHERE the journey runs, per CMS. Fixture paths are environment data, not
 * behaviour — the same distinction the contract suite draws with Target.types.
 * Every CMS seeds a different tree; none of the STEPS differ.
 */
const FIXTURES: Record<string, { root: string; target: string }> = {
  // Plone's mock serves the site's own test tree; the others seed the shared
  // canonical fixture (/news, /about). Playwright cannot set process.env per
  // project, so the run names its own fixture.
  'journey-plone': {
    root: '/_test_data',
    target: '/_test_data/context-navigation-forced-folder',
  },
  // The target must be a CHILD of the root — the journey picks it out of the
  // root's own listing, so a sibling like /about can never appear there.
  // Drupal and WordPress both build hierarchy from menu links and parent ids
  // rather than a distinct folder type, so any node can receive children and
  // an existing child of /news is the natural target.
  'journey-drupal': { root: '/news', target: '/news/first-post' },
  'journey-wordpress': { root: '/news', target: '/news/first-post' },
};

function fixtureFor(projectName: string) {
  const fixture = FIXTURES[projectName];
  // A new CMS must declare where it seeds content; defaulting would silently
  // run the journey against a tree that does not exist and report empty.
  if (!fixture) throw new Error(`No journey fixture declared for ${projectName}`);
  return {
    root: process.env.JOURNEY_ROOT ?? fixture.root,
    target: process.env.JOURNEY_TARGET_FOLDER ?? fixture.target,
  };
}

async function waitForRows(page: Page, timeout = 60_000) {
  await expect
    .poll(() => page.locator('tbody tr').count(), { timeout })
    .toBeGreaterThan(0);
}

test('create a page, link to another, then move it', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const { root: ROOT, target: TARGET_FOLDER } = fixtureFor(testInfo.project.name);
  const ploneCalls = forbidPloneApi(page, testInfo.project.name);
  const helper = new AdminUIHelper(page);
  await helper.login();

  // --- 1. browse existing content ---------------------------------------
  await page.goto(`${helper.adminUrl}${ROOT}/contents`);
  await waitForRows(page);

  // --- 2. create a page --------------------------------------------------
  await page.locator('#toolbar-add').click();
  // Whatever addable type this CMS offers first: the submenu ids encode the
  // TYPE NAME (#toolbar-add-document on Plone, #toolbar-add-page elsewhere),
  // so naming one would quietly make this a single-CMS test.
  await page.locator('[id^="toolbar-add-"]').first().click();
  await page.waitForURL(/\/add\?type=/, { timeout: 15_000 });

  const titleField = page.locator('input[id="field-title"]').first();
  await expect(titleField).toBeVisible({ timeout: 25_000 });
  await titleField.fill(TITLE);

  await page.locator('#toolbar-save, button:has-text("Save")').first().click();

  // The CMS assigned the document its own address, which it can only do if
  // the write succeeded. Deliberately NOT asserting that address contains the
  // title: how an id is derived is CMS-specific, and the contract suite had
  // this exact over-specification corrected out of it.
  await page.waitForURL((url) => !url.pathname.includes('/add'), {
    timeout: 30_000,
  });
  await expect(page).toHaveURL(new RegExp(`${ROOT}/[^/]+(/edit)?$`), {
    timeout: 25_000,
  });
  const createdPath = new URL(page.url()).pathname.replace(/\/edit$/, '');

  // --- 3. add an image and a link, in a BLOCK ----------------------------
  //
  // This step used to drive the relatedItems field, guarded by a canBrowse
  // check that skipped the whole thing and two .catch(() => {}) that swallowed
  // the clicks — so it asserted nothing, on every CMS. Removing the guard
  // showed why it was there: relatedItems is a Plone schema field. Drupal
  // assembles its schema from field_config and WordPress from its post type;
  // neither has one, so the step could never have worked on three CMSes.
  //
  // Blocks are the CMS-neutral half of the model. Their schemas are registered
  // by the FRONTEND, which is the same for all three journeys, and they travel
  // in one opaque field per CMS. The image block carries both an editable
  // media target and an editable link, so it covers the link and the image in
  // one place.
  // On the EDIT route, not the add form. Adding a block needs the editing
  // iframe's selection chrome — clicking a block on /add never produces a
  // handle, because that route does not render the editing surface — and an
  // update is the more honest exercise of the adapter anyway.
  if (!page.url().endsWith('/edit')) {
    await page.locator('#toolbar-edit, a[aria-label="Edit"]').first().click();
    await page.waitForURL(/\/edit$/, { timeout: 20_000 });
  }

  // The frontend renders blocks only once it has the document over the bridge,
  // so this is a condition to wait for, not a state to assert immediately.
  await expect
    .poll(
      async () => {
        try {
          return (await helper.getBlockOrder()).length;
        } catch {
          // Reading the iframe mid-navigation throws "Execution context was
          // destroyed". That is the poll catching the route in transit, not a
          // failure — returning 0 lets it retry, and it still fails for real
          // if blocks never arrive.
          return 0;
        }
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  const initialBlocks = await helper.getBlockOrder();

  await helper.clickBlockInIframe(initialBlocks[initialBlocks.length - 1]);
  await helper.clickAddBlockButton();
  await helper.selectBlockType('image');
  await helper.waitForBlockCountToBe(initialBlocks.length + 1);

  const withImage = await helper.getBlockOrder();
  const imageBlock = withImage.find((uid) => !initialBlocks.includes(uid))!;
  expect(imageBlock).toBeTruthy();

  // --- the image -----------------------------------------------------------
  await helper.setMediaFieldUrlInline(
    imageBlock,
    'url',
    'https://picsum.photos/400/300',
  );
  await expect(
    helper.getIframe().locator(`[data-block-uid="${imageBlock}"] img`),
  ).toHaveAttribute('src', /picsum\.photos/, { timeout: 15_000 });

  // --- the link, chosen by browsing ---------------------------------------
  // The object browser is how an editor picks a link target, and it is the
  // interesting half: the reference must be stored by the target's stable id,
  // not its path, or the move in step 5 would break it.
  const linkField = page
    .locator('#sidebar-properties')
    .locator('.field-wrapper-href, #field-href')
    .first();
  await expect(linkField).toBeVisible({ timeout: 20_000 });

  const objectBrowser = await helper.openObjectBrowserFromField(linkField);
  const targetName = TARGET_FOLDER.split('/').pop()!;
  await helper.objectBrowserSelectItem(objectBrowser, new RegExp(targetName));

  await expect(linkField).toContainText(targetName, { timeout: 15_000 });

  // Save the block work. The page already exists, so this is an update rather
  // than a create, and it is what puts the block through the adapter's
  // content.update path.
  await page.locator('#toolbar-save, button:has-text("Save")').first().click();
  await expect(page).toHaveURL(new RegExp(`${createdPath}$`), {
    timeout: 25_000,
  });


  // --- 4. it is listed under its parent ----------------------------------
  // Navigate within the SPA: a full page load is served under a different
  // session by the mock, so it would land in a world that never saw the
  // create.
  // Saving lands on the new document's EDIT view, whose toolbar is Save and
  // Cancel — no Back, no Contents. Leave edit mode first, then go up to the
  // parent, then into its listing. Every hop stays inside the SPA because the
  // mock scopes content to the session and a page load would start a new one.
  // Back to the listing through browser history.
  //
  // Not via the toolbar: after client-side navigation Volto's toolbar has no
  // Contents control here, because actions are fetched server-side and the
  // store still holds the previous route's. And not via page.goto: a full
  // load is served under a different session by the mock, which would land in
  // a world that never saw the create — verified, not assumed (49 rows, none
  // of them this page).
  //
  // History back is client-side, so the session and the new page both survive.
  // Each hop is awaited by URL; the listing then refetches on arrival, so
  // there is nothing to settle in between. It used to render restored-but-
  // unfetched because route data was only ever loaded server-side, which is
  // what bridge mode now does on the client.
  await page.goBack();
  await page.waitForURL(/\/add(\?|$)/, { timeout: 20_000 });
  // Let the add route finish rendering before popping the next entry: the URL
  // changes first, and restoring the listing mid-transition leaves it fetched
  // but not yet painted.
  //
  // Not by asserting an empty title. Volto keeps form state, so the restored
  // add form still shows the title typed in step 2 — verified, not assumed
  // (53 polls, "Journey 1787822868115" every time). The form's own controls
  // are what indicate this route has rendered.
  await expect(page.locator('#toolbar-save')).toBeVisible({ timeout: 25_000 });

  await page.goBack();
  await page.waitForURL(new RegExp(`${ROOT}/contents$`), { timeout: 20_000 });
  await waitForRows(page);

  const created = page.getByRole('row', { name: createdPath, exact: true });
  await expect(created).toHaveCount(1, { timeout: 20_000 });

  // --- 5. move it with cut and paste -------------------------------------
  await created.locator('td').nth(1).locator('button').click();
  const cut = page.getByRole('button', { name: 'Cut', exact: true });
  await expect(cut).toBeEnabled();
  await cut.click();

  const folder = page.getByRole('row', { name: TARGET_FOLDER, exact: true });
  await folder.getByRole('link').first().click();
  await expect(page).toHaveURL(new RegExp(`${TARGET_FOLDER}/contents$`), {
    timeout: 20_000,
  });
  await waitForRows(page);

  const paste = page.getByRole('button', { name: 'Paste', exact: true });
  await expect(paste).toBeEnabled();
  await paste.click();

  // It is now listed under its new parent — that is the claim, and it holds
  // for every CMS.
  //
  // Matched on the page's own id segment, NOT on a rewritten full path. Plone
  // moves the object and its path follows; Drupal and WordPress build
  // hierarchy from menu links and parent ids, so re-parenting deliberately
  // leaves the URL alias alone (design spec §8b) and the row still reads
  // /news/journey-xxx. Asserting the Plone-shaped path would demand behaviour
  // the other adapters are specified not to have. We are looking at the target
  // folder's own listing, so a match here means it is under the new parent
  // whichever way that CMS models it.
  const idSegment = createdPath.split('/').pop() as string;
  await expect(
    page.getByRole('row', { name: new RegExp(`/${idSegment}$`) }),
  ).toHaveCount(1, { timeout: 30_000 });

  // Checked last so the report lists every offender rather than only the first,
  // and so a genuine journey failure is not masked by this one.
  expect(
    ploneCalls,
    `${ploneCalls.length} request(s) reached the Plone API during a ` +
      `${testInfo.project.name} run — something bypassed the bridge:\n` +
      ploneCalls.slice(0, 20).join('\n'),
  ).toEqual([]);
});
