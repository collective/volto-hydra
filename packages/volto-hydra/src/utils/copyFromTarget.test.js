import { describe, it, expect, vi } from 'vitest';

// HydraSchemaContext.js is JSX inside a .js file (the admin build uses babel;
// vitest/vite can't transform JSX in .js). copyFromTarget → schemaInheritance
// imports '../context', so stub it — same convention as schemaInheritance.test.js.
vi.mock('../context', () => ({
  getHydraSchemaContext: () => ({}),
  setHydraSchemaContext: () => {},
  getLiveBlockData: () => null,
  HydraSchemaProvider: ({ children }) => children,
  useHydraSchemaContext: () => ({}),
}));

import {
  getTargetMapping,
  applyCopyFromTargetToSchema,
  getTargetValueForField,
  isFieldDivergedFromTarget,
  installCopyFromTargetEnhancers,
  getTargetId,
  COPY_FROM_TARGET_WIDGET,
} from './copyFromTarget';

// A teaser-like block: `href` is the link/url field carrying the target
// snapshot (selectedItemAttrs), and fieldMappings['@target'] maps target
// content attrs → this block's fields.
const teaserConfig = {
  id: 'teaser',
  fieldMappings: {
    '@target': {
      Title: 'title',
      Description: 'description',
      head_title: 'head_title',
      image_scales: { field: 'preview_image', type: 'image' },
    },
  },
  blockSchema: {
    properties: {
      href: { widget: 'object_browser', mode: 'link' },
      title: { title: 'Title' },
      description: { title: 'Description', widget: 'textarea' },
      head_title: { title: 'Kicker' },
      preview_image: { title: 'Image', widget: 'object_browser', mode: 'image' },
    },
  },
};

const targetSnapshot = {
  '@id': '/news/big',
  Title: 'Big News',
  Description: 'It happened',
  head_title: 'Breaking',
  image_field: 'image',
  image_scales: { image: [{ download: '/news/big/@@images/x.jpg' }] },
};

const schemaOf = () => ({
  properties: {
    href: { widget: 'object_browser', mode: 'link' },
    title: { title: 'Title' },
    description: { title: 'Description', widget: 'textarea' },
    head_title: { title: 'Kicker' },
    preview_image: { title: 'Image', widget: 'object_browser', mode: 'image' },
  },
});

describe('getTargetMapping', () => {
  it('returns the @target mapping when declared', () => {
    expect(getTargetMapping(teaserConfig)).toEqual(teaserConfig.fieldMappings['@target']);
  });
  it('returns null when there is no @target mapping', () => {
    expect(getTargetMapping({ id: 'slate', fieldMappings: { '@default': { title: 'x' } } })).toBeNull();
    expect(getTargetMapping({ id: 'slate' })).toBeNull();
  });
});

describe('applyCopyFromTargetToSchema — gating + widget swap', () => {
  it('is a no-op for a block without @target mapping', () => {
    const schema = schemaOf();
    const out = applyCopyFromTargetToSchema(schema, { id: 'slate' });
    expect(out.properties.title.widget).toBeUndefined();
  });

  it('swaps each mapped DESTINATION field to the wrapper widget, stashing the original', () => {
    const out = applyCopyFromTargetToSchema(schemaOf(), teaserConfig);
    // Destinations are the mapping *values* (title, description, head_title, preview_image)
    for (const field of ['title', 'description', 'head_title', 'preview_image']) {
      expect(out.properties[field].widget).toBe(COPY_FROM_TARGET_WIDGET);
      // original widget config preserved for faithful re-resolution
      expect(out.properties[field].baseWidget).toBeDefined();
    }
  });

  it('does NOT swap the URL field itself or unmapped fields', () => {
    const out = applyCopyFromTargetToSchema(schemaOf(), teaserConfig);
    expect(out.properties.href.widget).toBe('object_browser'); // url field untouched
  });

  it('is idempotent (re-running does not double-wrap)', () => {
    const once = applyCopyFromTargetToSchema(schemaOf(), teaserConfig);
    const twice = applyCopyFromTargetToSchema(once, teaserConfig);
    expect(twice.properties.title.baseWidget).not.toBe(COPY_FROM_TARGET_WIDGET);
    expect(twice.properties.title.widget).toBe(COPY_FROM_TARGET_WIDGET);
  });
});

describe('getTargetValueForField — typed extraction from the snapshot', () => {
  const data = { href: [targetSnapshot] };
  it('extracts a plain string field', () => {
    expect(getTargetValueForField('title', teaserConfig, data)).toBe('Big News');
    expect(getTargetValueForField('head_title', teaserConfig, data)).toBe('Breaking');
  });
  it('extracts via the source→dest mapping (Description → description)', () => {
    expect(getTargetValueForField('description', teaserConfig, data)).toBe('It happened');
  });
  it('returns undefined for an unmapped field', () => {
    expect(getTargetValueForField('href', teaserConfig, data)).toBeUndefined();
  });
  it('returns undefined when no target is selected', () => {
    expect(getTargetValueForField('title', teaserConfig, { href: [] })).toBeUndefined();
    expect(getTargetValueForField('title', teaserConfig, {})).toBeUndefined();
  });

  it('assembles an image field into the object_browser (mode=image) array form', () => {
    const data = { href: [targetSnapshot] };
    expect(getTargetValueForField('preview_image', teaserConfig, data)).toEqual([
      {
        '@id': '/news/big',
        image_field: 'image',
        image_scales: { image: [{ download: '/news/big/@@images/x.jpg' }] },
      },
    ]);
  });

  it('returns undefined for an image field when the target has no image', () => {
    const noImage = { '@id': '/x', Title: 'T' };
    expect(getTargetValueForField('preview_image', teaserConfig, { href: [noImage] })).toBeUndefined();
  });

  // Tags / other multi-value fields: a plain (non-typed) mapping passes the
  // array through as-is; no special handling needed beyond image.
  const tagsConfig = {
    id: 'card',
    fieldMappings: { '@target': { Subjects: 'tags' } },
    blockSchema: {
      properties: {
        href: { widget: 'object_browser', mode: 'link' },
        tags: { title: 'Tags', widget: 'array' },
      },
    },
  };
  it('passes a tags/array field through from the target', () => {
    const data = { href: [{ '@id': '/x', Subjects: ['news', 'plone'] }] };
    expect(getTargetValueForField('tags', tagsConfig, data)).toEqual(['news', 'plone']);
  });
  it('array divergence uses a value compare (same tags → not diverged)', () => {
    const data = { href: [{ '@id': '/x', Subjects: ['news', 'plone'] }], tags: ['news', 'plone'] };
    expect(isFieldDivergedFromTarget('tags', tagsConfig, data)).toBe(false);
    expect(isFieldDivergedFromTarget('tags', tagsConfig, { ...data, tags: ['news'] })).toBe(true);
  });
});

describe('live target — divergence/sync against the CURRENT target, not the snapshot', () => {
  it('getTargetId reads the link field @id', () => {
    expect(getTargetId(teaserConfig, { href: [targetSnapshot] })).toBe('/news/big');
    expect(getTargetId(teaserConfig, { href: [] })).toBeUndefined();
  });

  it('getTargetValueForField uses the live target (snapshot-shaped) when provided', () => {
    // Stored snapshot says 'Big News'; the live target has since changed.
    const data = { href: [targetSnapshot] };
    const live = { ...targetSnapshot, Title: 'Big News (updated)' };
    expect(getTargetValueForField('title', teaserConfig, data, live)).toBe('Big News (updated)');
    // …and falls back to the stored snapshot when no live target is passed.
    expect(getTargetValueForField('title', teaserConfig, data)).toBe('Big News');
  });

  it('divergence is measured against the live target when provided', () => {
    // Field matches the STALE snapshot but the live target changed → diverged.
    const data = { href: [targetSnapshot], title: 'Big News' };
    const live = { ...targetSnapshot, Title: 'Big News (updated)' };
    expect(isFieldDivergedFromTarget('title', teaserConfig, data)).toBe(false); // vs stale
    expect(isFieldDivergedFromTarget('title', teaserConfig, data, live)).toBe(true); // vs live
  });

});

describe('isFieldDivergedFromTarget', () => {
  const data = { href: [targetSnapshot], title: 'Custom title', description: 'It happened' };
  it('true when the field value differs from the target', () => {
    expect(isFieldDivergedFromTarget('title', teaserConfig, data)).toBe(true);
  });
  it('false when the field matches the target', () => {
    expect(isFieldDivergedFromTarget('description', teaserConfig, data)).toBe(false);
  });
  it('false when there is no target selected (nothing to diverge from)', () => {
    expect(isFieldDivergedFromTarget('title', teaserConfig, { title: 'x', href: [] })).toBe(false);
  });
});

describe('installCopyFromTargetEnhancers — auto-install, gated on @target', () => {
  const makeConfig = () => ({
    teaser: { ...teaserConfig },
    slate: { id: 'slate', blockSchema: { properties: { value: { widget: 'slate' } } } },
  });

  it('attaches an enhancer only to blocks with an @target mapping', () => {
    const cfg = makeConfig();
    installCopyFromTargetEnhancers(cfg);
    expect(typeof cfg.teaser.schemaEnhancer).toBe('function');
    expect(cfg.slate.schemaEnhancer).toBeUndefined(); // no @target → untouched
  });

  it("the installed enhancer swaps the teaser's mapped fields", () => {
    const cfg = makeConfig();
    installCopyFromTargetEnhancers(cfg);
    const out = cfg.teaser.schemaEnhancer({ schema: teaserConfig.blockSchema });
    expect(out.properties.title.widget).toBe(COPY_FROM_TARGET_WIDGET);
  });

  it('is idempotent (re-install does not stack enhancers)', () => {
    const cfg = makeConfig();
    installCopyFromTargetEnhancers(cfg);
    const first = cfg.teaser.schemaEnhancer;
    installCopyFromTargetEnhancers(cfg);
    expect(cfg.teaser.schemaEnhancer).toBe(first);
  });

  it('composes with an existing block schemaEnhancer (runs both)', () => {
    const cfg = makeConfig();
    let ran = false;
    cfg.teaser.schemaEnhancer = ({ schema }) => {
      ran = true;
      return schema;
    };
    installCopyFromTargetEnhancers(cfg);
    const out = cfg.teaser.schemaEnhancer({ schema: teaserConfig.blockSchema });
    expect(ran).toBe(true); // existing enhancer still runs
    expect(out.properties.title.widget).toBe(COPY_FROM_TARGET_WIDGET); // ours too
  });
});
