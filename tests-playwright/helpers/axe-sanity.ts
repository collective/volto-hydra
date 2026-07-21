import type { FrameLocator } from '@playwright/test';
import * as fs from 'fs';
import { createRequire } from 'module';

// Inject axe-core's source into the frame rather than using @axe-core/playwright:
// that wrapper pulls in its OWN @playwright/test, which breaks the single linked
// copy block-sanity relies on. axe-core is a standalone browser lib — run its
// source in the frame, then call window.axe.run().
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: number;
  tags: string[];
}

// WCAG 2.0/2.1 A + AA plus axe's best-practice preset (heading-order, region,
// landmark, page-has-heading-one, …). best-practice findings are reported as
// advisory, never blocking. Override the whole set with SANITY_AXE_TAGS (a
// comma-separated list of axe tags, e.g. "wcag2a,wcag2aa,wcag2aaa").
const DEFAULT_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

// Rules that need whole-page context. A block rendered in isolation in the sanity
// harness isn't under a page's landmarks / heading outline, so these would
// false-positive on every block — report them as advisory, never blocking.
const PAGE_LEVEL_RULES = new Set([
  'region',
  'landmark-one-main',
  'landmark-unique',
  'landmark-complementary-is-top-level',
  'landmark-no-duplicate-banner',
  'landmark-no-duplicate-contentinfo',
  'page-has-heading-one',
  'heading-order',
  'bypass',
  'document-title',
  'html-has-lang',
  'html-lang-valid',
]);

/**
 * Run axe-core against a single rendered block inside the preview iframe.
 *   blocking = serious/critical, block-level WCAG 2.0/2.1 A/AA violations
 *   advisory = everything else (moderate/minor, or page-level rules that can't
 *              be fairly judged on an isolated block)
 * Optional — only called when SANITY_AXE is set on the block-sanity run.
 */
export async function axeCheckBlock(
  iframe: FrameLocator,
  blockId: string,
): Promise<{ blocking: AxeViolation[]; advisory: AxeViolation[] }> {
  const body = iframe.locator('body');

  // Inject axe-core into the iframe's own frame (idempotent across blocks).
  await body.evaluate((_el, src) => {
    if (!(window as unknown as { axe?: unknown }).axe) {
      const s = document.createElement('script');
      s.textContent = src as string;
      document.head.appendChild(s);
    }
  }, axeSource);

  const tags = process.env.SANITY_AXE_TAGS
    ? process.env.SANITY_AXE_TAGS.split(',').map((t) => t.trim()).filter(Boolean)
    : DEFAULT_AXE_TAGS;

  const raw = (await body.evaluate(
    async (_el, { sel, tags }: { sel: string; tags: string[] }) => {
      const results = await (
        window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> } }
      ).axe.run({ include: [sel] }, { runOnly: { type: 'tag', values: tags } });
      return (results.violations as Array<Record<string, unknown>>).map((v) => ({
        id: v.id as string,
        impact: (v.impact as string) ?? null,
        help: v.help as string,
        nodes: (v.nodes as unknown[]).length,
        tags: v.tags as string[],
      }));
    },
    { sel: `[data-block-uid="${blockId}"]`, tags },
  )) as AxeViolation[];

  const blocking: AxeViolation[] = [];
  const advisory: AxeViolation[] = [];
  for (const v of raw) {
    const severe = v.impact === 'serious' || v.impact === 'critical';
    // A best-practice-only rule (no WCAG tag) or a page-context rule can't be
    // judged fairly on a block rendered in isolation — advisory, never blocking.
    const bestPracticeOnly =
      v.tags.includes('best-practice') && !v.tags.some((t) => t.startsWith('wcag'));
    if (severe && !bestPracticeOnly && !PAGE_LEVEL_RULES.has(v.id)) blocking.push(v);
    else advisory.push(v);
  }
  return { blocking, advisory };
}

export function formatViolations(vs: AxeViolation[]): string {
  return vs
    .map((v) => `  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes} node(s))`)
    .join('\n');
}
