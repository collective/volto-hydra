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
  it('relocates a document under a new parent', async () => {
    const moved: any = await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    expect(moved.path).toBe('/news/about');

    const fetched: any = await target.adapter.dispatch('content.get', {
      path: '/news/about',
    });
    expect(fetched.title).toBe('About');
  });

  it('leaves nothing behind at the old path', async () => {
    await target.adapter.dispatch('content.move', {
      path: '/about',
      targetParentPath: '/news',
    });

    await expect(
      target.adapter.dispatch('content.get', { path: '/about' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
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
    expect(ref.path).toBe('/news/about');
    expect(ref.title).toBe('About');
  });

  it('moves descendants along with their parent', async () => {
    // /news holds first-post and draft-post; moving it must not orphan them.
    const moved: any = await target.adapter.dispatch('content.move', {
      path: '/news',
      targetParentPath: '/about',
    });
    expect(moved.path).toBe('/about/news');

    const child: any = await target.adapter.dispatch('content.get', {
      path: '/about/news/first-post',
    });
    expect(child.title).toBe('First Post');
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
