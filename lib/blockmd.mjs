/**
 * blockmd — two-way conversion between Plone block documents and markdown.
 *
 * Implements the format sketched in ../mcp-content-authoring.md. Measured
 * against all real content; see ../blockmd-prototype/FINDINGS.md for how the
 * mapping was derived and what it can't carry.
 *
 * DESIGN — two layers, each doing what it is good at:
 *
 *   1. Frame layer (here). A line-anchored scanner for `:::type{attrs}` … `:::`.
 *      This grammar is ours and is always block-level at line start, so a
 *      scanner is exact and needs no dependency. It nests, and `::::name`
 *      opens a blocks_layout region while `::::name[]` opens an object_list
 *      field — the document states which, so the READER needs no schema.
 *
 *   2. Prose layer (remark). mdast <-> slate. Markdown parsing is where
 *      hand-rolling goes wrong — the python prototype's regexes lost inline
 *      code, split lists and mangled nested emphasis — so it is delegated.
 *
 * Page metadata rides in YAML frontmatter, authored fields only, plus an
 * ordered `blocks:` map (uid -> type) so a plain paragraph can BE a slate block
 * without a directive wrapper. That map is the proposal's blockMap (§3).
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import YAML from 'yaml';

const mdParser = unified().use(remarkParse).use(remarkGfm);
const mdSerializer = unified()
  .use(remarkStringify, { bullet: '-', emphasis: '*', strong: '*', fences: true, rule: '-' })
  .use(remarkGfm);

/**
 * Page fields that are NOT carried: server state, or derived from the tree.
 *
 * This is a denylist on purpose. It began as an allowlist of authored fields,
 * which silently dropped everything nobody had thought to enumerate: a Link's
 * `remoteUrl` -- its entire target -- and every Event's start, end, location
 * and contact details. An allowlist loses data quietly for each new content
 * type; a denylist keeps it and only drops what is known to be noise.
 */
export const SERVER_STATE = new Set([
  '@id', 'created', 'modified', 'workflow_history', 'lock', 'version',
  'working_copy', 'working_copy_of', 'next_item', 'previous_item',
  'changeActor', 'versioning_enabled', 'type_title', 'items', 'items_total',
  '@components', 'exportimport.constrains', 'exportimport.conversation',
  'exportimport.versions',
  // derived from tree position by whatever reads the tree
  'is_folderish', 'parent', 'getObjPositionInParent',
  // carried by the body, not the frontmatter
  'blocks', 'blocks_layout', 'plaintext',
]);

const RESERVED = new Set(['@type', '@id', 'blocks', 'blocks_layout', 'value', 'plaintext']);

// ---------------------------------------------------------------- slate ----
const MARK_KEYS = { strong: 'bold', emphasis: 'italic', delete: 'strikethrough' };

/** mdast inline nodes -> slate children. */
function inlineToSlate(nodes) {
  const out = [];
  for (const n of nodes || []) {
    switch (n.type) {
      case 'text':
        out.push({ text: n.value });
        break;
      case 'inlineCode':
        // Stored content uses a code NODE (859 of them) not a {code:true}
        // mark. Both exist in the data; emit the dominant form.
        out.push({ type: 'code', children: [{ text: n.value }] });
        break;
      case 'strong':
        out.push({ type: 'strong', children: inlineToSlate(n.children) });
        break;
      case 'emphasis':
        out.push({ type: 'em', children: inlineToSlate(n.children) });
        break;
      case 'delete':
        out.push({ type: 'del', children: inlineToSlate(n.children) });
        break;
      case 'link':
        out.push({ type: 'link', data: { url: n.url }, children: inlineToSlate(n.children) });
        break;
      case 'break':
        // Inverse of the hard-break emit: fold back into the previous leaf so
        // the text node matches what was stored.
        if (out.length && out[out.length - 1].text !== undefined && !out[out.length - 1].type) {
          out[out.length - 1].text += '\n';
        } else {
          out.push({ text: '\n' });
        }
        break;
      default:
        if (n.children) out.push(...inlineToSlate(n.children));
        else if (n.value != null) out.push({ text: String(n.value) });
    }
  }
  // Merge adjacent plain leaves. Folding hard breaks back into text produces
  // several leaves where storage had one, which is semantically identical but
  // does not compare equal.
  const merged = [];
  for (const n of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.text !== undefined && !prev.type && n.text !== undefined && !n.type
        && Object.keys(prev).length === 1 && Object.keys(n).length === 1) {
      prev.text += n.text;
    } else merged.push(n);
  }
  return merged.length ? merged : [{ text: '' }];
}

function listToSlate(node) {
  const items = (node.children || []).map((li) => {
    // A list item's children are usually a single paragraph.
    const kids = (li.children || []).flatMap((c) =>
      c.type === 'paragraph' ? inlineToSlate(c.children) : blockToSlate(c));
    return { type: 'li', children: kids.length ? kids : [{ text: '' }] };
  });
  return { type: node.ordered ? 'ol' : 'ul', children: items };
}

/** One mdast block node -> one slate top-level node. */
function blockToSlate(n, shift = 0) {
  switch (n.type) {
    case 'paragraph':
      return [{ type: 'p', children: inlineToSlate(n.children) }];
    case 'heading':
      // `shift` undoes the offset the emitter applied inside a repeating
      // container; see mdToSlate.
      return [{ type: `h${Math.min(6, Math.max(1, n.depth - shift))}`,
                children: inlineToSlate(n.children) }];
    case 'list':
      return [listToSlate(n)];
    case 'blockquote':
      return [{ type: 'blockquote', children: (n.children || []).flatMap((c) => blockToSlate(c, shift)) }];
    case 'code':
      return [{ type: 'p', children: [{ type: 'code', children: [{ text: n.value ?? '' }] }] }];
    case 'thematicBreak':
      return [];
    default:
      return n.children ? [{ type: 'p', children: inlineToSlate(n.children) }] : [];
  }
}

/**
 * markdown -> slate value.
 *
 * Returns a LIST of top-level nodes. docs/visual-editing.md says a slate value
 * always holds exactly one; stored content disagrees (43 of 997 hold more —
 * grid cards are a bold lead-in plus a body paragraph), so this does not
 * enforce the invariant.
 */
/**
 * markdown -> slate value.
 *
 * `shift` is the heading offset applied by the enclosing repeating container.
 * Inside `::::panels[object_list]{repeat="h2" …}` a child's own `## heading`
 * would be indistinguishable from the boundary that starts the next panel, so
 * the emitter writes it two levels deeper and the reader lifts it back. That
 * makes nesting unambiguous by construction rather than by hoping the author
 * kept their headings below the split.
 */
export function mdToSlate(md, shift = 0) {
  const tree = mdParser.parse(md);
  const out = (tree.children || []).flatMap((n) => blockToSlate(n, shift));
  return out.length ? out : [{ type: 'p', children: [{ text: '' }] }];
}

// slate -> mdast
function slateInlineToMdast(nodes) {
  const out = [];
  for (const n of nodes || []) {
    if (n.text !== undefined && !n.type) {
      // A newline inside a text leaf would reparse as a paragraph break.
      // markdown's hard break keeps it inside the same node.
      if (n.text.includes('\n') && !n.code) {
        const parts = n.text.split('\n');
        // Drop a trailing empty part: a newline at the very end of a paragraph
        // carries no meaning and would serialise to a dangling "\" that
        // reparses as a literal backslash.
        while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
        parts.forEach((part, idx) => {
          if (idx) out.push({ type: 'break' });
          if (part) out.push({ type: 'text', value: part });
        });
        continue;
      }
      let node = { type: 'text', value: n.text };
      // Marks nest outward; order is fixed so serialisation is stable.
      for (const [mdType, slateKey] of Object.entries(MARK_KEYS)) {
        if (n[slateKey]) node = { type: mdType, children: [node] };
      }
      if (n.code) node = { type: 'inlineCode', value: n.text };
      out.push(node);
      continue;
    }
    // An inline element with no content serialises to a bare "**" or "*",
    // which markdown reads back as literal asterisks. Stored content contains
    // several of these (empty strong/em left behind by editing).
    if (n.children && !plaintextOf(n.children) && n.type !== 'link' && n.type !== 'a') continue;
    switch (n.type) {
      case 'strong': case 'b':
        out.push({ type: 'strong', children: slateInlineToMdast(n.children) }); break;
      case 'em': case 'i':
        out.push({ type: 'emphasis', children: slateInlineToMdast(n.children) }); break;
      case 'del':
        out.push({ type: 'delete', children: slateInlineToMdast(n.children) }); break;
      case 'code':
        out.push({ type: 'inlineCode', value: plaintextOf(n.children) }); break;
      case 'link': case 'a':
        out.push({ type: 'link', url: n.data?.url ?? n.url ?? '',
                   children: slateInlineToMdast(n.children) }); break;
      default:
        out.push(...slateInlineToMdast(n.children));
    }
  }
  return out;
}

function slateBlockToMdast(n, shift = 0) {
  const t = n.type;
  if (/^h[1-6]$/.test(t)) {
    return { type: 'heading', depth: Math.min(6, +t[1] + shift),
             children: slateInlineToMdast(n.children) };
  }
  if (t === 'ul' || t === 'ol') {
    return {
      type: 'list', ordered: t === 'ol', spread: false,
      children: (n.children || []).map((li) => ({
        type: 'listItem', spread: false,
        children: [{ type: 'paragraph', children: slateInlineToMdast(li.children) }],
      })),
    };
  }
  if (t === 'blockquote') {
    return { type: 'blockquote', children: (n.children || []).map((c) => slateBlockToMdast(c, shift)) };
  }
  return { type: 'paragraph', children: slateInlineToMdast(n.children) };
}

export function slateToMd(value, shift = 0) {
  const tree = { type: 'root', children: (value || []).map((n) => slateBlockToMdast(n, shift)) };
  return mdSerializer.stringify(tree).trim();
}


/**
 * Does this slate value survive a markdown round-trip?
 *
 * Not all valid slate can be written as markdown. An editor can produce
 * adjacent emphasis nodes, a text leaf containing a bare "*", emphasis
 * boundaries that no markdown delimiters can reproduce. Those are legal slate
 * and the format must not lose them.
 *
 * So rather than enumerate markdown's limitations, the emitter CHECKS: if the
 * prose does not come back identical, that block falls back to raw slate in
 * the escape hatch. Losslessness becomes a property of the design instead of a
 * statistic we measure afterwards.
 */
export function slateRoundTrips(value, shift = 0) {
  try {
    const md = slateToMd(value, shift);
    // Empty prose emits nothing, and nothing cannot be read back as a block.
    if (!md.trim()) return false;
    return JSON.stringify(semantic(mdToSlate(md, shift))) === JSON.stringify(semantic(value));
  } catch {
    return false;
  }
}

/** Comparison view: empty text leaves are normalisation noise, not content. */
function semantic(v) {
  if (Array.isArray(v)) return v.map(semantic).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'text' && v.text === '') return undefined;
    const out = {};
    for (const k of keys.sort()) {
      const r = semantic(v[k]);
      // An empty children array and an absent one carry the same content;
      // stored slate uses both for an empty paragraph.
      if (r !== undefined && !(Array.isArray(r) && !r.length)) out[k] = r;
    }
    return out;
  }
  return v;
}

export function plaintextOf(v) {
  let s = '';
  const walk = (n) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      if (typeof n.text === 'string') s += n.text;
      (n.children || []).forEach(walk);
    }
  };
  walk(v);
  return s;
}

// ------------------------------------------------------------ attributes ---
/** A value that can live in {attrs}: scalar, single-line, not enormous. */
function attrable(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return true;
  if (typeof v === 'string') return !v.includes('\n') && !v.includes('"') && v.length <= 200;
  return false;
}

function fmtAttrs(o) {
  return Object.entries(o).map(([k, v]) => {
    if (v instanceof Template) return `${k}="${v.text}"`;
    if (Array.isArray(v) || (v && typeof v === 'object')) return `${k}=${JSON.stringify(v)}`;
    return typeof v === 'string' ? `${k}="${v}"` : `${k}=${v}`;
  }).join(' ');
}

const ATTR_RE = /([\w@.-]+)=(?:"([^"]*)"|(\S+))/g;

/**
 * An attribute value is a JSON scalar, or a `${...}` reference into the body.
 *
 * Those two spaces cannot overlap: `${` is not a valid start to any JSON
 * token, so a reference can never be mistaken for data and a literal never
 * needs escaping (`title="$5.00"` has no braces, so it is just a string).
 *
 * Anything else is an error. It used to fall through to `out[k] = bare`, so a
 * typo, a stray sigil, or syntax this reader predates all became plausible
 * string data and nothing complained -- the same silent-partial-loss shape as
 * the object_list bug that quietly dropped every codeExample's `code`.
 */
function parseAttrs(s) {
  const out = {};
  for (const [, k, quoted, bare] of (s || '').matchAll(ATTR_RE)) {
    if (quoted !== undefined) out[k] = isTemplate(quoted) ? new Template(quoted) : quoted;
    else if (bare === 'true' || bare === 'false') out[k] = bare === 'true';
    else if (bare === 'null') out[k] = null;
    else if (/^-?\d+(\.\d+)?$/.test(bare)) out[k] = Number(bare);
    else if (bare.startsWith('[') || bare.startsWith('{')) out[k] = JSON.parse(bare);
    else {
      throw new Error(
        `Bad attribute value ${k}=${bare}: expected a quoted string, a number, `
        + 'true/false/null, or a quoted "${reference}".',
      );
    }
  }
  return out;
}

/**
 * A quoted attribute carrying one or more `${...}` references.
 *
 * There is one syntax, always quoted:
 *
 *   title="${1/text}"       construct 1's `text`. The whole value is a single
 *                           reference, so the referenced type is preserved.
 *   tag="h${1/level}"       interpolation -- text around it, so the result is
 *                           a string, which is how level 2 becomes "h2"
 *                           without anything hardcoding the letter h.
 *

 * A Template is a kind established where it appears, never inferred from a
 * string's contents: source code in a fenced field is full of JS template
 * literals, and treating those as interpolation rewrote 11 codeExample blocks.
 */
class Template {
  constructor(text) { this.text = text; }
  /** The whole value is one reference — hand back the referenced type. */
  get whole() {
    const m = /^\$\{([^}]+)\}$/.exec(this.text);
    return m ? new Ref(m[1]) : null;
  }
}

/**
 * A reference: `part`, `N/part`, or `N.../hK`.
 *
 * The part vocabulary belongs to markdown's constructs, not to any block type,
 * which is what keeps the mechanism general.
 */
class Ref {
  constructor(spec) {
    // `2.../blocks_layout` -- constructs 2 onward, as a nested region. The
    // remainder of a group is how a repeating container holds child BLOCKS
    // rather than scalars: an accordion panel is a heading plus a whole
    // blocks_layout region, and its own headings sit below the split level so
    // the boundary stays unambiguous.
    const rest = /^(\d+)\.\.\.\/([A-Za-z]\w*)$/.exec(spec);
    if (rest) {
      this.index = Number(rest[1]) - 1;
      this.rest = true;
      this.part = rest[2];
      return;
    }
    const one = /^(?:(\d+)\/)?([A-Za-z]\w*)$/.exec(spec);
    if (!one) {
      throw new Error(`Bad reference "${spec}": expected part or N/part.`);
    }
    this.index = one[1] ? Number(one[1]) - 1 : null;
    this.part = one[2];
  }
}


// ------------------------------------------------- native markdown fields ---
/**
 * Some fields have a native markdown spelling: a heading block IS a heading, a
 * codeExample tab IS a heading plus a fenced code block. Writing them as
 * attributes or fenced JSON is the format failing at its one job.
 *
 * How to lay a block out is decided at CONVERSION time, from markdown-roles
 * (which names block types). What comes out records that decision in its own
 * attributes, so reading it needs nothing:
 *
 *     :::codeExample{uid="ce-8" tabs="${1.../h3}" tabs.label="${text}"
 *                    tabs.language="${lang}" tabs.code="${code}"}
 *     ### Nuxt.js
 *     ```vue
 *     <template>…</template>
 *     ```
 *     :::
 */

const isTemplate = (v) => typeof v === 'string' && /\$\{[^}]+\}/.test(v);

/** Forward: "h${1/level}" + constructs -> "h2". */
function interpolate(text, constructs) {
  return text.replace(/\$\{([^}]+)\}/g, (_, spec) => String(lookup(constructs, new Ref(spec)) ?? ''));
}

/**
 * Backward: "h${1/level}" + "h2" -> {level: "2"}.
 *
 * Interpolation is not generally invertible ("${a}${b}" = "h2" has several
 * solutions), so only the EMITTER runs it backwards, and then checks that
 * rendering the result reproduces the stored value. The parser only runs
 * forward.
 */
function invert(template, value) {
  if (typeof value !== 'string') return null;
  const parts = [];
  let last = 0;
  for (const m of template.matchAll(/\$\{([^}]+)\}/g)) {
    parts.push({ lit: template.slice(last, m.index) });
    parts.push({ name: m[1] });
    last = m.index + m[0].length;
  }
  parts.push({ lit: template.slice(last) });
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${parts.map((x) => ('name' in x ? '(.+?)' : esc(x.lit))).join('')}$`);
  const m = re.exec(value);
  if (!m) return null;
  const out = {};
  parts.filter((x) => 'name' in x).forEach((x, i) => { out[x.name] = m[i + 1]; });
  return out;
}

/** Plain text of mdast inline nodes. */
function mdText(nodes) {
  return (nodes || []).map((n) => (n.value != null ? n.value : mdText(n.children))).join('');
}

/** One mdast node -> the parts a reference can name. */
function partsOf(n) {
  if (n.type === 'heading') return { text: mdText(n.children), level: n.depth };
  if (n.type === 'code') return { lang: n.lang || '', code: n.value ?? '' };
  if (n.type === 'paragraph') {
    const kids = n.children || [];
    const only = kids.length === 1 ? kids[0] : null;
    if (only?.type === 'image') return { src: only.url, alt: only.alt || '' };
    if (only?.type === 'link') return { text: mdText(only.children), href: only.url };
    return { text: mdText(kids) };
  }
  return {};
}

/**
 * The body's block-level constructs. This is the whole vocabulary a reference
 * can name -- tied to markdown's constructs, not to any block type, which is
 * what keeps the mechanism general.
 */
function constructsOf(md) {
  return (mdParser.parse(md || '').children || []).map(partsOf);
}

/**
 * Repeating groups: from construct `from`, a new group at every heading of
 * `level`.
 *
 * A group is a LIST of constructs, not a merged bag, so `${N/part}` means the
 * same thing inside a group as it does at page level: the Nth construct's
 * part. `${1/text}` is the heading's text; `${2/lang}` is the language of the
 * code block under it. A reference that named no position would say nothing
 * about where the value lives.
 */
function sectionsOf(md, from, level) {
  const nodes = (mdParser.parse(md || '').children || []).slice(from);
  const out = [];
  for (const n of nodes) {
    if (n.type === 'heading' && n.depth === level) out.push([partsOf(n)]);
    else if (out.length) out[out.length - 1].push(partsOf(n));
  }
  return out;
}

/** `${part}` searches the constructs in order; `${N/part}` indexes one. */
function lookup(constructs, ref) {
  if (ref.index != null) return constructs[ref.index]?.[ref.part];
  return constructs.find((c) => c[ref.part] !== undefined)?.[ref.part];
}

/** Resolve one attribute value against a construct list. */
function resolveOne(tpl, constructs) {
  const whole = tpl.whole;
  if (whole) return lookup(constructs, whole);
  return interpolate(tpl.text, constructs);
}

/**
 * Resolve every reference in a block against its own body.
 *
 * `field.sub` attributes describe one repeating item, so they are collected
 * and applied per group rather than set on the block.
 */
function resolveRefs(block, md) {
  const constructs = constructsOf(md);
  const itemMap = {};
  for (const [k, v] of Object.entries(block)) {
    const dot = k.indexOf('.');
    if (dot > 0 && v instanceof Template) {
      (itemMap[k.slice(0, dot)] ||= {})[k.slice(dot + 1)] = v;
      delete block[k];
    }
  }
  for (const [k, v] of Object.entries(block)) {
    if (!(v instanceof Template)) continue;
    block[k] = resolveOne(v, constructs);
  }
}

/** Build the markdown for one construct from its parts. */
function renderConstruct(kind, parts) {
  if (kind === 'heading') {
    const level = Math.min(6, Math.max(1, Number(parts.level) || 2));
    return `${'#'.repeat(level)} ${parts.text}`;
  }
  if (kind === 'image') return `![${parts.alt ?? ''}](${parts.src})`;
  if (kind === 'link') return `[${parts.text}](${parts.href})`;
  return parts.text ?? '';
}

/**
 * Lift a block's mapped fields into the body, returning the markdown and the
 * attributes that replace them -- or null when it would not survive the round
 * trip, in which case the caller leaves the fields as ordinary attributes.
 */
function nativeBody(type, b, roles, schema, depth) {
  const role = roles?.[type];
  if (!role) return null;
  return role.sections ? sectionsBody(role.sections, b, schema, depth) : constructBody(role, b);
}

/** A single construct: heading block, image block. */
function constructBody(role, b) {
  const parts = {}, attrs = {};
  for (const [field, spec] of Object.entries(role.fields)) {
    const v = b[field];
    if (v == null || v === '') continue;
    const tpl = new Template(spec);
    const whole = tpl.whole;
    if (whole) {
      if (typeof v !== 'string') return null;
      parts[whole.part] = v;
    } else {
      const got = invert(spec, v);
      if (!got) return null;
      for (const [k, x] of Object.entries(got)) parts[new Ref(k).part] = x;
    }
    attrs[field] = spec;
  }
  if (parts.text === undefined && parts.src === undefined) return null;
  const md = renderConstruct(role.construct, parts);

  // Check, do not assume. A value the construct cannot carry (a heading whose
  // text ends in a space) keeps its literal attribute instead of being
  // silently rewritten.
  const back = constructsOf(md);
  for (const [field, spec] of Object.entries(attrs)) {
    if (resolveOne(new Template(spec), back) !== b[field]) return null;
  }
  return { md, attrs };
}

/**
 * One construct of a repeating group, from the parts that reference it.
 *
 * The kind follows from which parts are named — a `code` part means a fenced
 * block, `src` an image, `href` a link — so no block type is named here.
 * Position 0 is the group's boundary and is therefore always the heading.
 */
function renderAt(idx, parts, level) {
  if (idx === 0) {
    const t = parts.text;
    if (typeof t !== 'string' || !t.trim() || t !== t.trim()) return null;
    return `${'#'.repeat(level)} ${t}`;
  }
  if ('code' in parts) {
    const code = parts.code;
    if (typeof code !== 'string') return null;
    const fence = '`'.repeat(fenceLen(code));
    return `${fence}${parts.lang ?? ''}\n${code}\n${fence}`;
  }
  if ('src' in parts) return `![${parts.alt ?? ''}](${parts.src})`;
  if ('href' in parts) return `[${parts.text}](${parts.href})`;
  if (typeof parts.text === 'string') return parts.text;
  return null;
}

/** Item-template attributes: references stay references, ids stay literal. */
function templateAttrs(tmpl) {
  const out = {};
  for (const [k, v] of Object.entries(tmpl)) out[k] = typeof v === 'string' ? new Template(v) : v;
  return out;
}

/** A repeating field: codeExample tabs, accordion panels. */
function sectionsBody(sec, b, schema, depth) {
  const items = b[sec.field];
  if (!Array.isArray(items) || !items.length) return null;
  // The role writes the boundary the way it appears in the document ("h3");
  // the heading depth is the number inside it.
  const level = Number(String(sec.at).replace(/^h/i, ''));
  if (!(level >= 1 && level <= 6)) return null;

  // Invert the mapping, keeping the POSITION: which item field supplies
  // construct N's part P. `${2/lang}` is the language of the second construct
  // in the group, so the emitter has to put it there.
  const byIndex = new Map();
  const covered = new Set(['@id']);
  let regionField = null;          // the field that takes the REST of the group
  for (const [field, spec] of Object.entries(sec.item)) {
    const whole = new Template(spec).whole;
    if (!whole || whole.index == null) return null;
    if (whole.rest) {
      // The remainder of the group is a nested region: the item's children
      // are blocks, written as ordinary directives under the heading.
      if (whole.part !== 'blocks_layout') return null;
      regionField = field;
      covered.add(field).add('blocks_layout');
      continue;
    }
    if (!byIndex.has(whole.index)) byIndex.set(whole.index, {});
    byIndex.get(whole.index)[whole.part] = field;
    covered.add(field);
  }
  // The group is delimited by a heading, so construct 1 must be one.
  if (!byIndex.get(0)?.text) return null;

  // Each item is one chunk, joined by a blank line. A fence's own lines must
  // stay adjacent — blank-separating them puts empty lines INSIDE the code.
  const chunks = [];
  for (const item of items) {
    const lines = [];
    for (const idx of [...byIndex.keys()].sort((x, y) => x - y)) {
      const parts = {};
      for (const [part, field] of Object.entries(byIndex.get(idx))) parts[part] = item[field];
      const rendered = renderAt(idx, parts, level);
      if (rendered === null) return null;
      if (lines.length) lines.push('');
      lines.push(rendered);
    }
    // Fields with no markdown form ride a `:::@{…}` on the item: a select, or
    // an object_browser reference whose value is a 47-key catalog snapshot
    // that no link syntax can carry.
    const extra = Object.fromEntries(Object.entries(item).filter(([k]) => !covered.has(k)));
    if (Object.keys(extra).length) {
      const flat = {}, deep = {};
      for (const [k, v] of Object.entries(extra)) (attrable(v) ? flat : deep)[k] = v;
      lines.push('', `:::@{${fmtAttrs(flat)}}`);
      if (Object.keys(deep).length) {
        lines.push('```fields', JSON.stringify(deep, null, 1), '```');
      }
      lines.push(':::');
    }
    if (regionField) {
      const kids = item[regionField];
      if (kids && typeof kids === 'object') {
        const order = item.blocks_layout?.items ?? Object.keys(kids);
        for (const k of order) {
          if (kids[k]) lines.push('', blockToMd(k, kids[k], schema, (depth ?? 0) + 1, level));
        }
      }
    }
    chunks.push(lines.join('\n'));
  }
  const md = chunks.join('\n\n');

  // Check, do not assume -- the same contract the single-construct path has
  // always had. Without this a role that does not fit emits silently wrong
  // content instead of falling back: mapping a slider's `href` (an
  // object_browser reference carrying resolved metadata) onto a markdown link
  // produced "[See all Content Types]([object Object])" and dropped the
  // reference entirely.
  if (regionField) {
    // The children are `:::` directives, and the scanner does not treat a
    // heading inside one as a boundary -- a panel body legitimately contains
    // its own headings. So count boundaries the way the scanner does, at
    // directive depth zero, rather than with sectionsOf, which would see the
    // children's headings too and report false groups.
    const heads = [];
    let depth = 0;
    for (const line of md.split('\n')) {
      const open = /^(:{3,4})([\w-]*)(\[[^\]]*\])?(?:\{(.*)\})?\s*$/.exec(line);
      if (open && open[2]) { depth += 1; continue; }
      if (open && !open[2]) { depth -= 1; continue; }
      const h = depth === 0 && new RegExp(`^#{${level}}\\s+(.*)$`).exec(line);
      if (h) heads.push(h[1]);
    }
    const titleField = byIndex.get(0).text;
    if (heads.length !== items.length) return null;
    if (heads.some((t, i) => t !== items[i][titleField])) return null;
  } else {
    const groups = sectionsOf(md, 0, level);
    if (groups.length !== items.length) return null;
    for (const [i, item] of items.entries()) {
      for (const [field, spec] of Object.entries(sec.item)) {
        const got = resolveOne(new Template(spec), groups[i]);
        if (JSON.stringify(got) !== JSON.stringify(item[field])) return null;
      }
    }
  }

  // The container states its own shape: `[h3]` is the repeat boundary and the
  // attributes say which part of each group fills which field. The parent
  // block carries nothing, so its directive line stays readable.
  const tmpl = { ...sec.item };
  if (items.some((i) => i['@id'] !== undefined)) tmpl['@ids'] = items.map((i) => i['@id'] ?? null);
  return {
    region: `::::${sec.field}[object_list]{${fmtAttrs({ repeat: `h${level}`, ...templateAttrs(tmpl) })}}`,
    md,
    fields: [sec.field],
  };
}

// -------------------------------------------------------------- emitting ---
function childFields(schema, type) {
  return Object.entries(schema?.[type] || {})
    .filter(([, p]) => p.widget === 'object_list')
    .map(([f]) => f);
}


function blockToMd(uid, b, schema, depth = 0, shift = 0) {
  const type = b['@type'];
  const kidFields = childFields(schema, type);
  const skip = new Set([...RESERVED, ...kidFields]);
  const native = nativeBody(type, b, schema?._markdown, schema, depth);
  if (native) for (const f of native.fields ?? Object.keys(native.attrs)) skip.add(f);
  const attrs = {}, complex = {};
  for (const [k, v] of Object.entries(b)) {
    if (skip.has(k)) continue;
    (attrable(v) ? attrs : complex)[k] = v;
  }

  const refAttrs = {};
  if (native?.attrs) for (const [f, spec] of Object.entries(native.attrs)) {
    refAttrs[f] = typeof spec === 'string' ? new Template(spec) : spec;
  }
  const lines = [`:::${type}{${fmtAttrs({ uid, ...attrs, ...refAttrs })}}`];

  // A multi-line STRING is prose or source code — the things markdown exists
  // for. Emitting it as a JSON one-liner (which is what a generic escape hatch
  // does) makes the most common structured block, codeExample, unreadable and
  // unauthorable. Give it a fenced block labelled with the field name, and use
  // the `language` attr for highlighting when there is one.
  const fenced = {}, json = {};
  for (const [k, v] of Object.entries(complex)) {
    (typeof v === 'string' ? fenced : json)[k] = v;
  }
  if (Object.keys(json).length) {
    lines.push('```fields', JSON.stringify(json, null, 1), '```');
  }
  for (const [k, v] of Object.entries(fenced)) {
    lines.push(openFence(v, k, attrs.language), v, closeFence(v));
  }
  if (native?.region) lines.push(native.region, native.md, '::::');
  else if (native) lines.push(native.md);
  if ((type === 'slate' || type === 'introduction') && b.value) {
    if (slateRoundTrips(b.value, shift)) lines.push(slateToMd(b.value, shift));
    else lines.push('```field-json:value', JSON.stringify(b.value, null, 1), '```');
  }

  for (const f of kidFields) {
    if (!Array.isArray(b[f])) continue;
    // Already lifted into the body as repeating sections; emitting the
    // container too would give the field two sources and the parser would
    // push children onto a value that is not an array.
    if (native && (native.fields ?? Object.keys(native.attrs)).includes(f)) continue;
    // `[]` says these children are items in a field array, not blocks in a
    // region. The schema is consulted here, on the way out; the reader never
    // needs it because the marker is in the document.
    lines.push(`::::${f}[object_list]`);
    for (const item of b[f]) {
      if (item && typeof item === 'object') {
        // form.subblocks items have no @id; inventing "" adds a field that
        // was never there.
        const itemId = item['@id'] ?? '';
        const emitted = blockToMd(itemId, { ...item, '@type': item['@type'] ?? singular(f) }, schema, depth + 1);
        lines.push(itemId ? emitted : emitted.replace(/^(:::[\w-]+\{)uid="" ?/, '$1'));
      }
    }
    lines.push('::::');
  }

  if (b.blocks && typeof b.blocks === 'object') {
    const bl = b.blocks_layout || {};
    const regions = Object.keys(bl);
    if (!regions.length) {
      for (const [k, v] of Object.entries(b.blocks)) lines.push(blockToMd(k, v, schema, depth + 1));
    } else {
      for (const region of regions) {
        const named = regions.length > 1 || region !== 'items';
        if (named) lines.push(`::::${region}[blocks_layout]`);
        for (const k of bl[region] || []) if (b.blocks[k]) lines.push(blockToMd(k, b.blocks[k], schema, depth + 1));
        if (named) lines.push('::::');
      }
    }
  }
  lines.push(':::');
  return lines.join('\n');
}

/** A fence longer than any backtick run inside the payload. */
function fenceLen(text) {
  let max = 0;
  for (const m of String(text).matchAll(/`+/g)) max = Math.max(max, m[0].length);
  return Math.max(3, max + 1);
}
const openFence = (text, field, lang) =>
  '`'.repeat(fenceLen(text)) + `field:${field}` + (lang ? ` ${lang}` : '');
const closeFence = (text) => '`'.repeat(fenceLen(text));

const singular = (f) => (f.endsWith('s') ? f.slice(0, -1) : f);

export function pageToMd(page, schema = {}) {
  const blocks = page.blocks || {};
  const order = [...(page.blocks_layout?.items || [])];
  for (const k of Object.keys(blocks)) if (!order.includes(k)) order.push(k);

  const meta = {};
  for (const [k, v] of Object.entries(page)) if (!SERVER_STATE.has(k)) meta[k] = v;
  meta.blocks = order.filter((u) => blocks[u]).map((u) => ({ [u]: blocks[u]['@type'] }));

  const body = order.filter((u) => blocks[u]).map((uid) => {
    const b = blocks[uid];
    const extra = Object.keys(b).filter((k) => !['@type', 'value', 'plaintext'].includes(k));
    // Prose with nothing but a value renders as bare markdown.
    // Bare markdown only when there IS prose: an empty paragraph serialises to
    // an empty string and would silently disappear from the document.
    if (b['@type'] === 'slate' && !extra.length && (b.value || []).length === 1
        && slateToMd(b.value).trim() && slateRoundTrips(b.value)) {
      return slateToMd(b.value);
    }
    return blockToMd(uid, b, schema);
  });

  return `---\n${YAML.stringify(meta).trim()}\n---\n\n${body.join('\n\n')}\n`;
}

// --------------------------------------------------------------- parsing ---
/**
 * `:::type{attrs}` opens a block; `::::name` opens a container.
 *
 * A container is one of two different storage shapes, and the document says
 * which rather than the reader asking a schema:
 *
 *   ::::items      a blocks_layout region -- children are blocks in the
 *                  shared `blocks` dict, and the region records their order
 *   ::::panels[]   an object_list field  -- children are items inside a
 *                  field array; there is no shared dict and no ordering key
 *
 * `[]` cannot occur in a field or region name, so the two namespaces cannot
 * collide even when the names are identical. This is what lets mdToPage run
 * with no schema at all.
 */
const OPEN_RE = /^(:{3,4})([\w@-]*)(\[[^\]]*\])?(?:\{(.*)\})?\s*$/;

/**
 * markdown -> a page.
 *
 * Takes NO schema. Everything that used to need one is carried by the
 * document: `::::name[]` says a container holds field items rather than
 * blocks, and `${...}` references say which field a construct fills. That is
 * what makes a markdown mount possible -- the mock API can serve these files
 * without knowing any block type.
 */
/** An item opened by a heading: its regions become its blocks_layout. */
function closeItem(frame) {
  if (!frame) return;
  // The item's scalar fields come from the constructs in its OWN body, so
  // `${1/text}` is its heading and `${2/lang}` the fence under it.
  const constructs = constructsOf((frame.md ?? []).join('\n'));
  for (const [field, tpl] of Object.entries(frame.template ?? {})) {
    if (field === '@ids' || field === frame.regionField) continue;
    if (frame.block[field] === undefined) frame.block[field] = resolveOne(tpl, constructs);
  }
  if (frame.regions && Object.keys(frame.regions).length) {
    frame.block.blocks_layout = frame.regions;
  }
  // Blank lines between the heading and its children land in the frame's
  // scratch buffer. An item is not a prose block, so that is not content.
  delete frame.block._md;
}

export function mdToPage(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  const meta = m ? YAML.parse(m[1]) || {} : {};
  const body = m ? md.slice(m[0].length) : md;

  const blockmap = (meta.blocks || []).map((e) => {
    const [uid, type] = Object.entries(e)[0];
    return { uid, type };
  });
  delete meta.blocks;

  const blocks = {}, order = [];
  const stack = [];       // { uid, block, order, region }
  let buf = [];

  const flushProse = () => {
    const text = buf.join('\n').trim();
    buf = [];
    if (!text) return;
    const next = blockmap.find((e) => e.type === 'slate' && !(e.uid in blocks));
    const uid = next?.uid ?? `slate-${Object.keys(blocks).length}`;
    const value = mdToSlate(text);
    blocks[uid] = { '@type': 'slate', value, plaintext: plaintextOf(value) };
    order.push(uid);
  };

  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const open = OPEN_RE.exec(line);

    // A block is always three colons, a container always four. Keying this
    // off "has attributes" broke as soon as containers gained them.
    if (open && open[1] === ':::' && open[2] && open[4] !== undefined) {
      flushProse();
      const type = open[2];
      const attrs = parseAttrs(open[4]);
      const attrsHadUid = attrs.uid !== undefined;
      const uid = attrs.uid ?? `${type}-${Object.keys(blocks).length}`;
      delete attrs.uid;
      const parent = stack[stack.length - 1];

      // `:::@{…}` is not a block. It carries fields of the item that encloses
      // it -- the ones with no markdown form, like a select or an
      // object_browser reference. Without it a repeating container could only
      // hold items whose every field is prose-shaped.
      if (type === '@') {
        if (!parent?.isItem) throw new Error(':::@ must sit inside a repeating item.');
        Object.assign(parent.block, attrs);
        stack.push({ uid: '', block: parent.block, regions: {}, region: null,
                     isFields: true, shift: parent.shift });
        continue;
      }

      const block = { '@type': type, ...attrs };
      if (parent) {
        if (parent.regionIsField) {
          // Push the SAME object that goes on the stack, never a copy: later
          // ```fields updates mutate the stack entry, and a copy loses them
          // silently (this is how every codeExample lost its `code`).
          if (attrsHadUid) block['@id'] = uid;
          block._objlist = parent.region;
          (parent.block[parent.region] ||= []).push(block);
        } else {
          (parent.block.blocks ||= {})[uid] = block;
          (parent.regions ||= {});
          const region = parent.region || 'items';
          (parent.regions[region] ||= []).push(uid);
        }
      } else {
        blocks[uid] = block;
        order.push(uid);
      }
      stack.push({ uid, block, regions: {}, region: null,
                   shift: stack[stack.length - 1]?.shift ?? 0 });
      continue;
    }

    if (open && open[1] === '::::' && open[2]) {
      if (stack.length) {
        const top = stack[stack.length - 1];
        top.region = open[2];
        const kind = (open[3] ?? '').slice(1, -1);
        if (kind !== 'blocks_layout' && kind !== 'object_list') {
          throw new Error(`::::${open[2]}${open[3] ?? ''}: a region must name its widget `
            + '-- [blocks_layout] or [object_list].');
        }
        top.regionIsField = kind === 'object_list';
        // `repeat="h3"` says the body is split into one item per h3, with the
        // remaining attributes saying which part of each group fills which
        // field. The container knows its own shape, so the parent block
        // carries nothing about it.
        const attrs = parseAttrs(open[4]);
        const at = /^h([1-6])$/.exec(String(attrs.repeat?.text ?? attrs.repeat ?? ''));
        delete attrs.repeat;
        top.repeatAt = at ? Number(at[1]) : null;
        top.itemTemplate = at ? attrs : null;
        // One path for every repeat: a heading opens an item frame, the
        // item's own lines accumulate in it, `:::` children become its blocks
        // and `:::@` sets its fields. Collecting the whole region as markdown
        // and splitting it at the end could not see directives at all, so a
        // `:::@` inside an item was swallowed as prose.
        top.itemRegion = at && Object.entries(attrs).find(
          ([, v]) => v instanceof Template && v.whole?.rest);
        top.itemCount = 0;
      }
      continue;
    }

    if (line === ':::' || line === '::::') {
      if (line === '::::' && stack[stack.length - 1]?.isItem) closeItem(stack.pop());
      const top = stack[stack.length - 1];
      if (line === '::::' && top?.region) {
        top.region = null;
        top.regionIsField = false;
        top.repeatAt = null;
        top.itemTemplate = null;
        top.itemRegion = null;
        continue;
      }
      const frame = stack.pop();
      if (frame?.isFields) { delete frame.block._md; continue; }
      if (frame) {
        const { block, regions } = frame;
        if (regions && Object.keys(regions).length) block.blocks_layout = regions;
        const region = block._objlist;
        delete block._objlist;
        // blockToMd synthesises a type from the field name (tabs -> tab) for
        // items that have none; drop it again so the item matches storage.
        if (region && block['@type'] === singular(region)) delete block['@type'];
        const hadRaw = block._rawValue; delete block._rawValue;
        const isProse = block['@type'] === 'slate' || block['@type'] === 'introduction';
        if (!hadRaw && isProse && block._md) {
          block.value = mdToSlate(block._md.trim(), frame.shift ?? 0);
          block.plaintext = plaintextOf(block.value);
        }
        if (hadRaw && block.value) block.plaintext = plaintextOf(block.value);
        // Fields written in their native markdown are read back out of the
        // body. The document says where each one goes, so this needs no
        // schema and knows no block types.
        if (!isProse) resolveRefs(block, block._md || '');
        delete block._md;
      }
      continue;
    }

    const jsonFence = /^(`{3,})field-json:([\w.-]+)\s*$/.exec(line);
    if (jsonFence && stack.length) {
      const close = jsonFence[1];
      const chunk = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== close) chunk.push(lines[j++]);
      stack[stack.length - 1].block[jsonFence[2]] = JSON.parse(chunk.join('\n'));
      stack[stack.length - 1].block._rawValue = true;
      i = j;
      continue;
    }

    const fieldFence = /^(`{3,})field:([\w.-]+)(?:\s+\S+)?\s*$/.exec(line);
    if (fieldFence && stack.length) {
      const close = fieldFence[1];
      const chunk = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== close) chunk.push(lines[j++]);
      stack[stack.length - 1].block[fieldFence[2]] = chunk.join('\n');
      i = j;
      continue;
    }

    if (line === '```fields' && stack.length) {
      const chunk = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '```') chunk.push(lines[j++]);
      Object.assign(stack[stack.length - 1].block, JSON.parse(chunk.join('\n')));
      i = j;
      continue;
    }

    // A heading may arrive with the previous item still open, so look past an
    // open item frame for the region that owns the repeat.
    const itemOnTop = stack[stack.length - 1]?.isItem;
    const openItem = stack[stack.length - (itemOnTop ? 2 : 1)];
    if (openItem && openItem.repeatAt) {
      const h = new RegExp(`^#{${openItem.repeatAt}}\\s+(.*)$`).exec(line);
      if (h) {
        if (itemOnTop) closeItem(stack.pop());
        const item = {};
        const ids = openItem.itemTemplate['@ids'];
        if (Array.isArray(ids) && ids[openItem.itemCount] != null) {
          item['@id'] = ids[openItem.itemCount];
        }
        openItem.itemCount += 1;
        (openItem.block[openItem.region] ||= []).push(item);
        stack.push({
          uid: '', block: item, regions: {}, region: null, isItem: true,
          template: openItem.itemTemplate,
          regionField: openItem.itemRegion?.[1]?.whole?.part ?? null,
          md: [raw],                    // the item's own lines, heading first
          // Children wrote their headings below the split level; lift them
          // back by the same amount.
          shift: openItem.repeatAt,
        });
        continue;
      }
    }

    if (stack.length) {
      const top = stack[stack.length - 1];
      if (top.isItem) top.md.push(raw);
      else top.block._md = (top.block._md ?? '') + raw + '\n';
    } else if (!line && buf.length) {
      flushProse();
    } else if (line) {
      buf.push(raw);
    }
  }
  flushProse();

  // An item with no blocks has no layout either. Synthesising an empty one
  // makes a Link or an Event differ from what it actually stores.
  if (!order.length && !Object.keys(blocks).length) return { ...meta };
  return { ...meta, blocks, blocks_layout: { items: order } };
}
