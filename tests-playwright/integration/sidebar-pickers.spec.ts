/**
 * The three sidebar pickers, in a real admin.
 *
 * Their unit tests all mock the schema context, so they pin the logic given a
 * context and say nothing about whether the sidebar supplies the right one.
 * Nothing else covers the case either: no integration spec drives a widget that
 * reads `useHydraSchemaContext()` — not `blockTypeSelect`, not
 * `schemaFieldSelect`, not `copyFromTarget`. That gap is why a picker could
 * offer the wrong blocks, or show a choice and store nothing, with every unit
 * test green.
 *
 * A form is the case that exercises it: its questions are object_list ITEMS, so
 * a widget on one has to know which item it is inside.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/** The form fixture's questions, in the order the page holds them. */
const FIRST_QUESTION = 'field-name';
const LAST_QUESTION = 'field-file';

/** Open a question's own sidebar form. */
async function selectQuestion(helper: AdminUIHelper, uid: string) {
  const iframe = helper.getIframe();
  await expect(iframe.locator(`[data-block-uid="${uid}"]`)).toBeVisible({
    timeout: 30000,
  });
  await helper.clickBlockInIframe(uid, { waitForToolbar: false });
}

/** The options a react-select field is offering, as text. */
async function openMenu(page, field: string): Promise<string[]> {
  const wrapper = page.locator(`#sidebar-properties .field-wrapper-${field}`);
  await expect(wrapper).toBeVisible({ timeout: 15000 });
  await wrapper.locator('.react-select__control').click();
  const menu = page.locator('.react-select__menu');
  await menu.waitFor({ state: 'visible', timeout: 10000 });
  return menu.locator('.react-select__option').allTextContents();
}

test.describe('Sidebar pickers', () => {
  test('blockPicker offers the questions BEFORE this one, and nothing else', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/form-test-page');

    // The LAST question: everything above it is fair game, itself is not.
    await selectQuestion(helper, LAST_QUESTION);
    const offered = await openMenu(page, 'show_when_field');
    expect(
      offered.some((o) => o.includes('Full Name')),
      'a question above this one is offered',
    ).toBe(true);
    expect(
      offered.some((o) => o.includes('Attach a file')),
      'a question cannot depend on itself',
    ).toBe(false);
    await page.keyboard.press('Escape');

    // The FIRST question: nothing precedes it, so the menu holds only the
    // empty entry. This is the assertion that catches a picker reading the
    // wrong block — it offers a plausible-looking list instead of none.
    await selectQuestion(helper, FIRST_QUESTION);
    const forFirst = await openMenu(page, 'show_when_field');
    expect(
      forFirst.filter((o) => !o.includes('—')),
      'the first question has nothing to depend on',
    ).toEqual([]);
  });

  test('blockPicker stores the nominated field, not the block id', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/form-test-page');
    await selectQuestion(helper, LAST_QUESTION);

    const wrapper = page.locator(
      '#sidebar-properties .field-wrapper-show_when_field',
    );
    await wrapper.locator('.react-select__control').click();
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 10000 });
    await menu.locator('.react-select__option', { hasText: 'Full Name' }).click();

    // Kept, rather than shown and dropped: leave the block and come back, so
    // the value has to have survived the form data rather than living in the
    // widget's own state.
    await expect(wrapper.locator('.react-select__single-value')).toContainText(
      'Full Name',
    );
    await selectQuestion(helper, FIRST_QUESTION);
    await selectQuestion(helper, LAST_QUESTION);
    await expect(
      wrapper.locator('.react-select__single-value'),
      'the picked question survives leaving the block and returning',
    ).toContainText('Full Name', { timeout: 15000 });
  });

  test('vocabularySelect lists the vocabularies the site keeps', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/form-test-page');
    // The dropdown question is the one that can take its options from a list.
    await selectQuestion(helper, 'field-subject');

    // An empty menu is what a failed request looks like — the widget swallows
    // the error and renders nothing — so the assertion is that terms arrived.
    const offered = await openMenu(page, 'options_from');
    expect(
      offered.filter((o) => !o.includes('—')).length,
      'the site lists its vocabularies',
    ).toBeGreaterThan(0);
  });
});
