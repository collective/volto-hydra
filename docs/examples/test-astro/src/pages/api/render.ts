import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BlockRenderer from '$examples/BlockRenderer.astro';
import Content from '$examples/Content.astro';

/**
 * Render the chosen unit and return its HTML.
 *
 * The bridge sends one of two shapes:
 *
 *   { unit: { unit: 'page' }, formData }
 *     → render the full content area (every top-level block, in order).
 *     The client replaces `#content`'s innerHTML with the response.
 *
 *   { unit: { unit: 'block', blockId: X }, formData }
 *     → render just block X. BlockRenderer wraps the block in
 *     `<div data-block-uid={X}>` so the response is a self-contained
 *     swap target. The client replaces that one element's outerHTML.
 *
 * findChangedUnit (client-side, diff.js) decides which shape to send.
 *
 * Why Container API: it lets us call BlockRenderer.astro server-side
 * outside of a page lifecycle so the per-block render path doesn't have
 * to spin up a full page render. Stable since Astro 5.x.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { unit, formData } = body as {
    unit: { unit: 'page' } | { unit: 'block'; blockId: string };
    formData: { blocks: Record<string, any>; blocks_layout: { items: string[] } };
  };

  const container = await AstroContainer.create();

  if (unit.unit === 'page') {
    const html = await container.renderToString(Content as any, {
      props: { formData },
    });
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // unit === 'block' — find the block data anywhere in the nested
  // structure. Top-level lookup first; if absent the bridge sent a
  // nested block id and we walk the form's container fields recursively
  // to locate it. The diff guarantees the id exists in newForm, so
  // missing data here is a bug worth surfacing rather than silently
  // recovering — return 404 and let the client log it.
  const block = findBlockById(formData, unit.blockId);
  if (!block) {
    return new Response(`Block not found: ${unit.blockId}`, { status: 404 });
  }
  const html = await container.renderToString(BlockRenderer as any, {
    props: { block, content: formData },
  });
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

/**
 * Walk the form data looking for a block with the given UID. The bridge
 * tracks the path internally via blockPathMap; we don't replicate that
 * structure here — we just walk known container fields. If a future
 * container shape uses a non-standard field name, add it to this helper
 * (mirrors the list in diff.js#getContainerFields).
 */
function findBlockById(formData: any, blockId: string): any {
  const blocks = formData?.blocks;
  if (!blocks) return null;
  if (blocks[blockId]) {
    return { ...blocks[blockId], '@uid': blockId };
  }
  for (const child of Object.values(blocks) as any[]) {
    const inside = findBlockById(child, blockId);
    if (inside) return inside;
  }
  return null;
}
