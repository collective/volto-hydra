// Aggregate slate TEXT-STYLE coverage across all discovered block examples.
//
// The content gate checks that no stored node breaks its region's rules. This is
// the other direction: every text style actually in use must have an example
// that RENDERS, and must render DIFFERENTLY from ordinary body text. A style
// that renders identically to a paragraph is a lie told to the author — they
// pick "Subtitle", nothing changes, and nothing anywhere says why.
//
// Nothing here assumes HOW a style renders. The frontend chooses its own markup
// (hydra's test frontend renders `strong` as a styled <span> on purpose), so the
// check compares a style's rendered appearance against the appearance of plain
// body text on the SAME page and only asks that they differ.
//
// Aggregated, not per-example, for the same reason field-coverage is: a style
// legitimately appears in some examples and not others. Only "no example
// anywhere" is a finding.
//
// The aggregation crosses WORKERS. Playwright gives each worker its own process,
// so module state alone makes the result depend on which worker happened to run
// the final assertion — it passed on one run and reported "0 styles measured" on
// the next, from identical content. A check whose answer depends on scheduling
// is worse than no check, so each worker appends what it saw to a file and the
// aggregate merges them. field-coverage.ts documents the same hazard and leans
// on `fullyParallel: false`; this does not need that promise to be kept.

/** What a style looks like once rendered. Compared for difference, never for a value. */
export type StyleSignature = string;

/** A style's appearance plus WHICH element produced it, so identity is checkable. */
export type Measured = { sig: StyleSignature; node: number };

import * as fs from 'fs';
import * as path from 'path';

type Seen = { blockType: string; text: string; pagePath: string };

// Shared by every worker of one run. A fixed path under cwd (which all workers
// share) rather than an env var, which globalSetup cannot reliably push into
// worker processes.
const COVERAGE_DIR = path.resolve(process.cwd(), '.text-style-coverage');

const seen = new Map<string, Seen>();                    // style -> where first found
const signatures = new Map<string, StyleSignature>();    // style -> how it rendered
const flat = new Set<string>();                          // styles that matched body text
                                                          // on a DIFFERENT element

/** Every element `type` in a slate value, at any depth, with its text. */
export function slateStyles(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: any) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const text = plainText(node).trim();
    // A style with no text of its own cannot be located in the DOM, so we can't
    // measure it — don't claim coverage we didn't take.
    if (text) {
      if (typeof node.type === 'string' && !out.has(node.type)) {
        out.set(node.type, text);
      }
      // A design system's OWN styles — Volto's StyleMenu writes each one's
      // `cssClass` into `styleName` (space separated), driven by
      // `config.settings.slate.styleDefinitions`. They are styles in exactly the
      // sense that matters here: an author picks one and expects to see
      // something. Prefixed so a DS class can never collide with an element type.
      if (typeof node.styleName === 'string') {
        for (const cls of node.styleName.split(/\s+/).filter(Boolean)) {
          if (!out.has(`.${cls}`)) out.set(`.${cls}`, text);
        }
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(value);
  return out;
}

function plainText(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(plainText).join('');
}

/**
 * Record one example's styles and the signature each one rendered with.
 *
 * @param signaturesByStyle - style -> signature, or null when the style's text
 *   was not found in the rendered output at all
 * @param baseline - signature of ordinary body text on that page, if found
 */
export function recordTextStyles(
  blockType: string,
  pagePath: string,
  value: unknown,
  measured: Record<string, Measured | null>,
  baseline?: Measured | null,
): void {
  for (const [style, text] of slateStyles(value)) {
    if (!seen.has(style)) seen.set(style, { blockType, text, pagePath });
    const m = measured[style];
    if (!m) continue;
    // First rendering example wins: a later example where the style is absent
    // or empty must not undo coverage already earned.
    if (!signatures.has(style)) signatures.set(style, m.sig);
    // "Looks like body text" is only meaningful when the two are DIFFERENT
    // elements. A paragraph that is entirely bold is one element wearing both
    // hats, and says nothing about whether bold is visible.
    if (baseline && m.sig === baseline.sig && m.node !== baseline.node) {
      flat.add(style);
    }
  }
  share();
}

/** Persist this worker's view so the aggregate can merge every worker's. */
function share(): void {
  try {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(COVERAGE_DIR, `${process.pid}.json`),
      JSON.stringify({
        seen: [...seen],
        signatures: [...signatures],
        flat: [...flat],
      }),
    );
  } catch {
    // A read-only cwd costs only cross-worker merging; the in-memory view still
    // works and the fail-closed check still fails closed.
  }
}

/** Merge every worker's file into this process's view. Idempotent. */
function mergeWorkers(): void {
  let files: string[] = [];
  try {
    files = fs.readdirSync(COVERAGE_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return;
  }
  for (const f of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(COVERAGE_DIR, f), 'utf-8'));
      for (const [style, s] of d.seen || []) if (!seen.has(style)) seen.set(style, s);
      for (const [style, sig] of d.signatures || []) if (!signatures.has(style)) signatures.set(style, sig);
      for (const f of d.flat || []) flat.add(f);
    } catch {
      // A half-written file from a worker still running: skip rather than fail
      // the aggregate on a partial read.
    }
  }
}

/** Drop coverage left by a previous run. Call once, from globalSetup. */
export function resetSharedTextStyleCoverage(): void {
  try {
    fs.rmSync(COVERAGE_DIR, { recursive: true, force: true });
  } catch {
    /* nothing to clear */
  }
}

/** Styles present in content that never rendered anywhere. */
export function stylesNeverRendered(): Array<{ style: string } & Seen> {
  mergeWorkers();
  return [...seen.entries()]
    .filter(([style]) => !signatures.has(style))
    .map(([style, s]) => ({ style, ...s }));
}

/**
 * Styles that rendered, but indistinguishably from plain body text.
 *
 * The default block type is exempt: it IS body text. So is any style whose
 * signature we never got a baseline to compare against.
 */
export function stylesRenderingAsPlainText(
  defaultBlockType = 'p',
): Array<{ style: string } & Seen> {
  mergeWorkers();
  return [...flat]
    .filter((style) => style !== defaultBlockType && seen.has(style))
    .map((style) => ({ style, ...(seen.get(style) as Seen) }));
}

/** Every style seen in the discovered content — used to fail closed. */
export function stylesSeenInContent(): string[] {
  mergeWorkers();
  return [...seen.keys()].sort();
}

/** Test-only: reset module state AND the shared files, so cases stay isolated. */
export function resetTextStyleCoverage(): void {
  seen.clear();
  signatures.clear();
  flat.clear();
  resetSharedTextStyleCoverage();
}

/**
 * Measure, in the page, how each style actually looks — and how body text looks
 * next to it.
 *
 * Deliberately knows nothing about markup. It finds the innermost element whose
 * whole text is the style's text and takes a signature of its COMPUTED style, so
 * a frontend rendering a heading as a `<div>` or bold as a styled `<span>`
 * passes on its merits. Shared by every block-sanity suite so "how do we measure
 * a style" has one answer.
 *
 * `blockLocator` is a Playwright Locator for the rendered block; typed loosely so
 * this module stays importable by the unit tests (no playwright dependency).
 *
 * @returns { out: style -> signature|null, baseline: signature|null }
 */
export async function measureTextStyles(
  blockLocator: { evaluate: Function },
  items: Array<{ style: string; text: string }>,
): Promise<{ out: Record<string, Measured | null>; baseline: Measured | null }> {
  return await blockLocator
    .evaluate((root: HTMLElement, wanted: Array<{ style: string; text: string }>) => {
      // Match with ALL whitespace removed. A container style's slate text is
      // its children concatenated with no separator ("oneTwo"), while the DOM
      // puts them in separate elements and reads back "one Two" — comparing on
      // collapsed-but-present whitespace reported every `ol`/`ul` as rendering
      // nowhere.
      const norm = (t: string) => t.replace(/[\u200b\ufeff\u00a0\s]/g, '');

      // What something LOOKS like, reduced to properties that make one style
      // visibly distinct from another. No tag name on purpose.
      const signature = (el: Element) => {
        const c = getComputedStyle(el);
        return [
          c.fontSize, c.fontWeight, c.fontStyle, c.fontFamily,
          c.textDecorationLine, c.textTransform, c.letterSpacing,
          c.verticalAlign, c.display, c.color,
        ].join('|');
      };

      // The INNERMOST element whose whole text is this style's text — the
      // element the style produced, not an ancestor that merely contains it.
      const locate = (text: string) => {
        const target = norm(text);
        if (!target) return null;
        // `root` itself counts. A slate block often renders AS the styled
        // element (`<h3 data-block-uid=…>`), in which case no descendant holds
        // the text and searching only descendants reported every such heading
        // as rendering nowhere.
        const all = [root, ...root.querySelectorAll('*')].filter(
          (el) => norm(el.textContent || '') === target,
        );
        return all.length ? (all[all.length - 1] as HTMLElement) : null;
      };

      // Tag each located element so the caller can tell "these two styles are
      // the same element" from "these two styles look alike". A paragraph that
      // is entirely bold resolves `p` and `strong` to ONE element, and without
      // identity that reads as "bold renders like body text" — which was
      // reported, and was wrong.
      const ids = new Map<Element, number>();
      const idOf = (el: Element) => {
        if (!ids.has(el)) ids.set(el, ids.size);
        return ids.get(el) as number;
      };

      const out: Record<string, { sig: string; node: number } | null> = {};
      for (const { style, text } of wanted) {
        const el = locate(text);
        out[style] = el ? { sig: signature(el), node: idOf(el) } : null;
      }

      // Body text is how the DEFAULT BLOCK TYPE renders, which we have already
      // measured — not "the longest leaf run". That was the first attempt and it
      // was wrong: in a block whose only long run happens to be bold, the
      // heuristic made BOLD the baseline and then reported bold as looking like
      // body text. `p` is the definition of body text, so use it.
      const baseline = out['p'] ?? null;
      return { out, baseline };
    }, items)
    .catch(() => ({ out: {}, baseline: null }));
}
