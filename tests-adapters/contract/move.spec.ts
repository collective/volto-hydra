import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { resolveTarget, type Target } from '../targets';

let target: Target;

beforeAll(async () => {
  target = await resolveTarget();
  await target.start();
}, 240_000);

afterAll(async () => {
  await target.stop();
});

beforeEach(async () => {
  await target.seed();
});

describe('content.move', () => {
  /**
   * The contract fixes that the document ends up UNDER the new parent and is
   * addressable there — deliberately not that its URL changed.
   *
   * Plone's path IS its tree position and WordPress derives the path from the
   * parent chain, so both do change the URL. Drupal does not: menus carry
   * structure and path aliases carry URLs, so re-parenting must not rewrite a
   * published URL. Asserting a specific new path would force a Drupal adapter
   * to fake one, which is how a contract quietly becomes a description of one
   * CMS.
   */
  it('relocates a document under a new parent', async () => {
    const moved: any = await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    expect(moved.path).toBeTruthy();

    // Addressable wherever it now lives.
    const fetched: any = await target.adapter.dispatch('content.get', {
      path: moved.path,
    });
    expect(fetched.title).toBe('About');

    // And genuinely under the new parent, which is what "moved" means.
    const children: any = await target.adapter.dispatch('tree.list', {
      parent: '/news',
    });
    expect(children.items.map((i: any) => i.id)).toContain(moved.id);
  });

  it('no longer appears under its old parent', async () => {
    const before: any = await target.adapter.dispatch('content.get', {
      path: '/about',
    });

    await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    // Membership, not addressability: a CMS may legitimately keep the old URL
    // working. What must not survive is the old PARENT still claiming it.
    const oldParent: any = await target.adapter.dispatch('tree.list', {
      parent: '/',
    });
    expect(oldParent.items.map((i: any) => i.id)).not.toContain(before.id);
  });

  /**
   * The assertion that ties moving to the reference model.
   *
   * A move changes a document's path by definition. If `id` changed with it,
   * every stored link to that document would break the moment an editor
   * cut-and-pasted it in the contents view — the single most ordinary thing a
   * site editor does. `id` is the stable handle; a move must not touch it.
   */
  it('preserves the document id across the move', async () => {
    const before: any = await target.adapter.dispatch('content.get', {
      path: '/about',
    });

    const moved: any = await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    expect(moved.id).toBe(before.id);
  });

  it('keeps links to the document working after it moves', async () => {
    const before: any = await target.adapter.dispatch('content.get', {
      path: '/about',
    });

    await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    const ref: any = await target.adapter.dispatch('reference.resolve', {
      id: before.id,
    });
    expect(ref.id).toBe(before.id);
    expect(ref.path).toBeTruthy();
    expect(ref.title).toBe('About');
  });

  it('moves descendants along with their parent', async () => {
    // /news holds first-post and draft-post; moving it must not orphan them.
    const moved: any = await target.adapter.dispatch('content.move', {
      path: '/news',
      targetParentPath: '/about',
    });

    // The children came along: they are still children of the moved folder,
    // wherever that folder now is.
    const children: any = await target.adapter.dispatch('tree.list', {
      parent: moved.path,
    });
    expect(children.items.map((i: any) => i.title)).toContain('First Post');
  });

  it('rejects moving a document into itself', async () => {
    await expect(
      target.adapter.dispatch('content.move', {
        path: '/news',
        targetParentPath: '/news',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_MOVE' });
  });
});

describe('content.order', () => {
  it('reorders siblings within their parent', async () => {
    const before: any = await target.adapter.dispatch('tree.list', {
      parent: '/news',
    });
    const paths = before.items.map((i: any) => i.path);
    expect(paths.length).toBe(2);

    await target.adapter.dispatch('content.order', {
      path: paths[1],
      targetIndex: 0,
    });

    const after: any = await target.adapter.dispatch('tree.list', {
      parent: '/news',
    });
    expect(after.items.map((i: any) => i.path)[0]).toBe(paths[1]);
    expect(after.items.length).toBe(2);
  });
});
