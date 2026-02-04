import { expandTemplates, mergeTemplatesIntoPage } from './hydra.js';

// Wrapper to match old applyLayoutTemplate signature for existing tests
async function applyLayoutTemplate(pageData, templateData, uuidGenerator) {
  const templateUrl = templateData['@id'];
  const { merged } = await mergeTemplatesIntoPage(pageData, {
    loadTemplate: async () => templateData,
    pageBlocksFields: { blocks: { allowedLayouts: [templateUrl] } },
    uuidGenerator,
  });
  return merged;
}

// Wrapper to match old mergeTemplateContent signature for existing tests
async function mergeTemplateContent(target, source, filterTemplateId = null) {
  // For merge tests, source contains template structure, target has page content
  // This simulates the old merge behavior
  const { merged } = await mergeTemplatesIntoPage(target, {
    loadTemplate: async () => source,
    pageBlocksFields: { blocks: {} },
  });
  return { merged };
}

describe('applyLayoutTemplate', () => {
  let counter = 0;
  const uuidGenerator = () => `uuid-${++counter}`;

  beforeEach(() => {
    counter = 0;
  });

  describe('first time layout application', () => {
    test('applies layout with header, default, footer to page with user content', async () => {
      const pageData = {
        blocks: {
          'user-block-1': { '@type': 'slate', value: [{ text: 'User content 1' }] },
          'user-block-2': { '@type': 'slate', value: [{ text: 'User content 2' }] },
        },
        blocks_layout: { items: ['user-block-1', 'user-block-2'] },
      };

      const templateData = {
        '@id': '/templates/header-footer',
        blocks: {
          'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
          'default-slot': { '@type': 'slate', placeholder: 'default', value: [] },
          'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
        },
        blocks_layout: { items: ['header', 'default-slot', 'footer'] },
      };

      const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);

      // Debug: check what we got
      const blockIds = Object.keys(result.blocks);
      const layoutItems = result.blocks_layout?.items || [];

      // User content should be preserved
      expect(result.blocks['user-block-1']).toBeDefined();
      expect(result.blocks['user-block-2']).toBeDefined();

      // Should have header placeholder block
      const headerBlocks = Object.entries(result.blocks).filter(([_, b]) => b.placeholder === 'header');
      expect(headerBlocks.length).toBeGreaterThanOrEqual(1);

      // Should have footer placeholder block
      const footerBlocks = Object.entries(result.blocks).filter(([_, b]) => b.placeholder === 'footer');
      expect(footerBlocks.length).toBeGreaterThanOrEqual(1);

      // Should have: header (fixed) + footer (fixed) + 2 user blocks = 4
      // The template's non-fixed default-slot is replaced by user content
      expect(blockIds.length).toBe(4);

      // All blocks should have the new templateId
      for (const block of Object.values(result.blocks)) {
        expect(block.templateId).toBe('/templates/header-footer');
      }
    });

    test('user content goes into default placeholder', async () => {
      const pageData = {
        blocks: {
          'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
        },
        blocks_layout: { items: ['user-block'] },
      };

      const templateData = {
        '@id': '/templates/test',
        blocks: {
          'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
          'default-slot': { '@type': 'slate', placeholder: 'default', value: [] },
        },
        blocks_layout: { items: ['header', 'default-slot'] },
      };

      const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);

      // User block should have placeholder: 'default'
      expect(result.blocks['user-block'].placeholder).toBe('default');
    });

    test('blocks are ordered: header, user content, footer', async () => {
      const pageData = {
        blocks: {
          'user-block-1': { '@type': 'slate', value: [{ text: 'User 1' }] },
          'user-block-2': { '@type': 'slate', value: [{ text: 'User 2' }] },
        },
        blocks_layout: { items: ['user-block-1', 'user-block-2'] },
      };

      const templateData = {
        '@id': '/templates/header-footer',
        blocks: {
          'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
          'default-slot': { '@type': 'slate', placeholder: 'default', value: [] },
          'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
        },
        blocks_layout: { items: ['header', 'default-slot', 'footer'] },
      };

      const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);
      const layout = result.blocks_layout.items;

      // Find positions
      const headerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'header');
      const footerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'footer');
      const user1Index = layout.indexOf('user-block-1');
      const user2Index = layout.indexOf('user-block-2');

      // Header at start
      expect(headerIndex).toBe(0);
      // Footer at end
      expect(footerIndex).toBe(layout.length - 1);
      // User content between header and footer
      expect(user1Index).toBeGreaterThan(headerIndex);
      expect(user1Index).toBeLessThan(footerIndex);
      expect(user2Index).toBeGreaterThan(headerIndex);
      expect(user2Index).toBeLessThan(footerIndex);
    });
  });

  describe('layout switching', () => {
    test('multiple user blocks in default placeholder preserved when switching layouts', async () => {
      // Page with existing layout applied (blocks have templateId)
      const pageData = {
        blocks: {
          'old-header': { '@type': 'slate', fixed: true, templateId: '/templates/old', placeholder: 'header', value: [{ text: 'Old Header' }] },
          'user-block-1': { '@type': 'slate', templateId: '/templates/old', placeholder: 'default', value: [{ text: 'User 1' }] },
          'user-block-2': { '@type': 'slate', templateId: '/templates/old', placeholder: 'default', value: [{ text: 'User 2' }] },
          'old-footer': { '@type': 'slate', fixed: true, templateId: '/templates/old', placeholder: 'footer', value: [{ text: 'Old Footer' }] },
        },
        blocks_layout: { items: ['old-header', 'user-block-1', 'user-block-2', 'old-footer'] },
      };

      const newTemplateData = {
        '@id': '/templates/new',
        blocks: {
          'new-header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'New Header' }] },
          'new-default': { '@type': 'slate', placeholder: 'default', value: [] },
          'new-footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'New Footer' }] },
        },
        blocks_layout: { items: ['new-header', 'new-default', 'new-footer'] },
      };

      const result = await applyLayoutTemplate(pageData, newTemplateData, uuidGenerator);

      // Both user blocks should be preserved
      expect(result.blocks['user-block-1']).toBeDefined();
      expect(result.blocks['user-block-2']).toBeDefined();

      // Fixed blocks reuse IDs but have new templateId and preserved content (editable)
      expect(result.blocks['old-header']).toBeDefined();
      expect(result.blocks['old-header'].templateId).toBe('/templates/new');
      expect(result.blocks['old-header'].value[0].text).toBe('Old Header'); // Content preserved
      expect(result.blocks['old-footer']).toBeDefined();
      expect(result.blocks['old-footer'].templateId).toBe('/templates/new');

      // All blocks should have new templateId
      for (const block of Object.values(result.blocks)) {
        expect(block.templateId).toBe('/templates/new');
      }
    });

    test('old fixed blocks replaced by new template fixed blocks', async () => {
      const pageData = {
        blocks: {
          'old-header': { '@type': 'slate', fixed: true, templateId: '/templates/old', placeholder: 'header', value: [{ text: 'Old Header' }] },
          'user-block': { '@type': 'slate', templateId: '/templates/old', placeholder: 'default', value: [{ text: 'User' }] },
        },
        blocks_layout: { items: ['old-header', 'user-block'] },
      };

      const newTemplateData = {
        '@id': '/templates/new',
        blocks: {
          'new-header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'New Header' }] },
          'new-default': { '@type': 'slate', placeholder: 'default', value: [] },
        },
        blocks_layout: { items: ['new-header', 'new-default'] },
      };

      const result = await applyLayoutTemplate(pageData, newTemplateData, uuidGenerator);

      // Old header ID is reused with new templateId and preserved content (editable)
      expect(result.blocks['old-header']).toBeDefined();
      expect(result.blocks['old-header'].templateId).toBe('/templates/new');
      expect(result.blocks['old-header'].value[0].text).toBe('Old Header'); // Content preserved

      // Should have exactly one header block
      const headerBlocks = Object.entries(result.blocks).filter(
        ([_, b]) => b.placeholder === 'header' && b.fixed
      );
      expect(headerBlocks.length).toBe(1);
    });

    test('non-matching placeholder (footer removed) - user content preserved', async () => {
      const pageData = {
        blocks: {
          'old-header': { '@type': 'slate', fixed: true, templateId: '/templates/old', placeholder: 'header', value: [{ text: 'Old Header' }] },
          'user-block': { '@type': 'slate', templateId: '/templates/old', placeholder: 'default', value: [{ text: 'User' }] },
          'old-footer': { '@type': 'slate', fixed: true, templateId: '/templates/old', placeholder: 'footer', value: [{ text: 'Old Footer' }] },
        },
        blocks_layout: { items: ['old-header', 'user-block', 'old-footer'] },
      };

      // New template has no footer
      const newTemplateData = {
        '@id': '/templates/header-only',
        blocks: {
          'new-header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'New Header' }] },
          'new-default': { '@type': 'slate', placeholder: 'default', value: [] },
        },
        blocks_layout: { items: ['new-header', 'new-default'] },
      };

      const result = await applyLayoutTemplate(pageData, newTemplateData, uuidGenerator);

      // User content preserved
      expect(result.blocks['user-block']).toBeDefined();

      // Old footer should be gone (no matching placeholder)
      expect(result.blocks['old-footer']).toBeUndefined();

      // No footer placeholder in result
      const footerBlocks = Object.entries(result.blocks).filter(
        ([_, b]) => b.placeholder === 'footer'
      );
      expect(footerBlocks.length).toBe(0);
    });
  });
});

describe('mergeTemplateContent', () => {
  test('collects multiple blocks per placeholder', async () => {
    const target = {
      blocks: {
        'target-default': { '@type': 'slate', templateId: '/templates/test', templateInstanceId: 'inst-1', placeholder: 'default', value: [] },
      },
      blocks_layout: { items: ['target-default'] },
    };

    const source = {
      '@id': '/templates/test',
      blocks: {
        'source-1': { '@type': 'slate', placeholder: 'default', value: [{ text: 'Source 1' }] },
        'source-2': { '@type': 'slate', placeholder: 'default', value: [{ text: 'Source 2' }] },
      },
      blocks_layout: { items: ['source-1', 'source-2'] },
    };

    const { merged } = await mergeTemplateContent(target, source);

    // User content block should be preserved in the result
    expect(merged.blocks['target-default']).toBeDefined();
    expect(merged.blocks['target-default'].placeholder).toBe('default');
  });
});

describe('fallback placement when no default placeholder', () => {
  let counter = 0;
  const uuidGenerator = () => `fallback-uuid-${++counter}`;

  beforeEach(() => {
    counter = 0;
  });

  test('content goes to bottom placeholder (after last fixed block) when no default', async () => {
    const pageData = {
      blocks: {
        'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
      },
      blocks_layout: { items: ['user-block'] },
    };

    // Template with fixed blocks and a non-fixed slot AFTER the last fixed block
    const templateData = {
      '@id': '/templates/bottom-slot',
      blocks: {
        'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
        'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
        'post-footer': { '@type': 'slate', placeholder: 'post_footer', value: [] },
      },
      blocks_layout: { items: ['header', 'footer', 'post-footer'] },
    };

    const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);
    const layout = result.blocks_layout.items;

    // User content should exist
    expect(result.blocks['user-block']).toBeDefined();

    // User content should have placeholder 'default' assigned
    expect(result.blocks['user-block'].placeholder).toBe('default');

    // Find positions
    const footerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'footer');
    const userIndex = layout.indexOf('user-block');

    // User content should be after footer (in post_footer position since no default)
    expect(userIndex).toBeGreaterThan(footerIndex);
  });

  test('content goes to top placeholder (before first fixed block) when no default or bottom', async () => {
    const pageData = {
      blocks: {
        'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
      },
      blocks_layout: { items: ['user-block'] },
    };

    // Template with non-fixed slot BEFORE the first fixed block, no default, no bottom slot
    const templateData = {
      '@id': '/templates/top-slot',
      blocks: {
        'pre-header': { '@type': 'slate', placeholder: 'pre_header', value: [] },
        'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
        'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
      },
      blocks_layout: { items: ['pre-header', 'header', 'footer'] },
    };

    const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);
    const layout = result.blocks_layout.items;

    // User content should exist
    expect(result.blocks['user-block']).toBeDefined();

    // Find positions
    const headerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'header');
    const userIndex = layout.indexOf('user-block');

    // User content should be before header (in pre_header position)
    expect(userIndex).toBeLessThan(headerIndex);
  });

  test('content is dropped when no default, no bottom, no top placeholder', async () => {
    const pageData = {
      blocks: {
        'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
      },
      blocks_layout: { items: ['user-block'] },
    };

    // Template with ONLY fixed blocks - no placeholders for user content
    const templateData = {
      '@id': '/templates/fixed-only',
      blocks: {
        'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
        'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
      },
      blocks_layout: { items: ['header', 'footer'] },
    };

    const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);

    // User content should be dropped (not in result)
    expect(result.blocks['user-block']).toBeUndefined();

    // Only fixed blocks should remain
    const layout = result.blocks_layout.items;
    expect(layout.length).toBe(2);
  });

  test('default placeholder takes priority over bottom/top slots', async () => {
    const pageData = {
      blocks: {
        'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
      },
      blocks_layout: { items: ['user-block'] },
    };

    // Template with default AND bottom slot - default should win
    const templateData = {
      '@id': '/templates/default-and-bottom',
      blocks: {
        'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header' }] },
        'default-slot': { '@type': 'slate', placeholder: 'default', value: [] },
        'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Footer' }] },
        'post-footer': { '@type': 'slate', placeholder: 'post_footer', value: [] },
      },
      blocks_layout: { items: ['header', 'default-slot', 'footer', 'post-footer'] },
    };

    const result = await applyLayoutTemplate(pageData, templateData, uuidGenerator);
    const layout = result.blocks_layout.items;

    // Find positions
    const headerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'header');
    const footerIndex = layout.findIndex(id => result.blocks[id]?.placeholder === 'footer');
    const userIndex = layout.indexOf('user-block');

    // User content should be between header and footer (in default position, not post_footer)
    expect(userIndex).toBeGreaterThan(headerIndex);
    expect(userIndex).toBeLessThan(footerIndex);
  });
});

describe('page reload merge - standalone blocks preserved', () => {
  test('standalone blocks (no templateId) are preserved at original positions during merge', async () => {
    // Simulates a page that has a layout applied plus standalone blocks outside the template
    // On page reload, merge is called to sync template content
    // Standalone blocks should NOT be affected

    const target = {
      blocks: {
        'standalone-before': {
          '@type': 'slate',
          // No templateId, no placeholder - this is outside the template
          value: [{ text: 'Standalone before' }],
        },
        'template-header': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          templateId: '/templates/test',
          templateInstanceId: 'inst-1',
          placeholder: 'header',
          value: [{ text: 'Old Header' }],
        },
        'user-content': {
          '@type': 'slate',
          templateId: '/templates/test',
          templateInstanceId: 'inst-1',
          placeholder: 'default',
          value: [{ text: 'User content' }],
        },
        'template-footer': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          templateId: '/templates/test',
          templateInstanceId: 'inst-1',
          placeholder: 'footer',
          value: [{ text: 'Old Footer' }],
        },
        'standalone-after': {
          '@type': 'slate',
          // No templateId, no placeholder - this is outside the template
          value: [{ text: 'Standalone after' }],
        },
      },
      blocks_layout: {
        items: ['standalone-before', 'template-header', 'user-content', 'template-footer', 'standalone-after'],
      },
    };

    const source = {
      '@id': '/templates/test',
      blocks: {
        'src-header': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          placeholder: 'header',
          value: [{ text: 'New Header From Template' }],
        },
        'src-default': {
          '@type': 'slate',
          placeholder: 'default',
          value: [],
        },
        'src-footer': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          placeholder: 'footer',
          value: [{ text: 'New Footer From Template' }],
        },
      },
      blocks_layout: { items: ['src-header', 'src-default', 'src-footer'] },
    };

    const { merged } = await mergeTemplateContent(target, source);

    // Standalone blocks should be preserved
    expect(merged.blocks['standalone-before']).toBeDefined();
    expect(merged.blocks['standalone-after']).toBeDefined();

    // They should be at their original positions (before and after template content)
    const layout = merged.blocks_layout.items;
    const standaloneBefore = layout.indexOf('standalone-before');
    const standaloneAfter = layout.indexOf('standalone-after');

    // Find template block positions
    const headerIndex = layout.findIndex(id => merged.blocks[id]?.placeholder === 'header');
    const footerIndex = layout.findIndex(id => merged.blocks[id]?.placeholder === 'footer');

    expect(standaloneBefore).toBeLessThan(headerIndex);
    expect(standaloneAfter).toBeGreaterThan(footerIndex);

    // User content should be preserved
    expect(merged.blocks['user-content']).toBeDefined();
  });
});

describe('reverse merge - page to template (for saving)', () => {
  let counter = 0;
  const uuidGenerator = () => `uuid-${++counter}`;

  beforeEach(() => {
    counter = 0;
  });

  test('user edits in page merge back to template', async () => {
    // Original template - has templateId pointing to itself and instanceId
    const template = {
      '@id': '/templates/header-footer',
      blocks: {
        'header': { '@type': 'slate', fixed: true, readOnly: true, templateId: '/templates/header-footer', templateInstanceId: 'inst-1', placeholder: 'header', value: [{ text: 'Original Header' }] },
        'default-slot': { '@type': 'slate', templateId: '/templates/header-footer', templateInstanceId: 'inst-1', placeholder: 'default', value: [] },
        'footer': { '@type': 'slate', fixed: true, readOnly: true, templateId: '/templates/header-footer', templateInstanceId: 'inst-1', placeholder: 'footer', value: [{ text: 'Original Footer' }] },
      },
      blocks_layout: { items: ['header', 'default-slot', 'footer'] },
    };

    // Page with layout applied - user has added content and edited fixed blocks
    const pageWithEdits = {
      blocks: {
        'page-header': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          templateId: '/templates/header-footer',
          templateInstanceId: 'inst-1',
          placeholder: 'header',
          value: [{ text: 'User Edited Header' }], // User edited the header (in template edit mode)
        },
        'user-block-1': {
          '@type': 'slate',
          templateId: '/templates/header-footer',
          templateInstanceId: 'inst-1',
          placeholder: 'default',
          value: [{ text: 'User content 1' }],
        },
        'user-block-2': {
          '@type': 'slate',
          templateId: '/templates/header-footer',
          templateInstanceId: 'inst-1',
          placeholder: 'default',
          value: [{ text: 'User content 2' }],
        },
        'page-footer': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          templateId: '/templates/header-footer',
          templateInstanceId: 'inst-1',
          placeholder: 'footer',
          value: [{ text: 'User Edited Footer' }], // User edited the footer (in template edit mode)
        },
      },
      blocks_layout: { items: ['page-header', 'user-block-1', 'user-block-2', 'page-footer'] },
    };

    // Merge page content back INTO template (reverse direction)
    // This simulates what happens on save
    const { merged } = await mergeTemplatesIntoPage(template, {
      loadTemplate: async () => pageWithEdits, // The "template" to load is actually the page
      pageBlocksFields: { blocks: { allowedLayouts: ['/templates/header-footer'] } },
      uuidGenerator,
    });

    // Template should now have user's edits in the fixed blocks
    const headerBlock = Object.values(merged.blocks).find(b => b.placeholder === 'header' && b.fixed);
    expect(headerBlock).toBeDefined();
    expect(headerBlock.value[0].text).toBe('User Edited Header');

    const footerBlock = Object.values(merged.blocks).find(b => b.placeholder === 'footer' && b.fixed);
    expect(footerBlock).toBeDefined();
    expect(footerBlock.value[0].text).toBe('User Edited Footer');
  });

  test('fixed+readOnly transfers to template, fixed+editable stays on page', async () => {
    // When saving to template:
    // - Fixed + readOnly block edits → transfer to template (template-owned content)
    // - Fixed + editable block edits → stay on page (page-level overrides)
    // - User content in placeholders → stays on page
    const template = {
      '@id': '/templates/mixed',
      blocks: {
        'readonly-header': { '@type': 'slate', fixed: true, readOnly: true, templateId: '/templates/mixed', templateInstanceId: 'inst-1', placeholder: 'header', value: [{ text: 'Original ReadOnly Header' }] },
        'editable-banner': { '@type': 'slate', fixed: true, templateId: '/templates/mixed', templateInstanceId: 'inst-1', placeholder: 'banner', value: [{ text: 'Original Editable Banner' }] },
        'default-slot': { '@type': 'slate', templateId: '/templates/mixed', templateInstanceId: 'inst-1', placeholder: 'default', value: [] },
      },
      blocks_layout: { items: ['readonly-header', 'editable-banner', 'default-slot'] },
    };

    const pageWithEdits = {
      blocks: {
        'page-header': {
          '@type': 'slate',
          fixed: true,
          readOnly: true,
          templateId: '/templates/mixed',
          templateInstanceId: 'inst-1',
          placeholder: 'header',
          value: [{ text: 'Edited ReadOnly Header' }], // Template edit mode changed this
        },
        'page-banner': {
          '@type': 'slate',
          fixed: true,
          // No readOnly - this is editable per-page
          templateId: '/templates/mixed',
          templateInstanceId: 'inst-1',
          placeholder: 'banner',
          value: [{ text: 'Page-specific Banner' }], // Page override - should NOT go to template
        },
        'user-content': {
          '@type': 'slate',
          templateId: '/templates/mixed',
          templateInstanceId: 'inst-1',
          placeholder: 'default',
          value: [{ text: 'User content' }],
        },
      },
      blocks_layout: { items: ['page-header', 'page-banner', 'user-content'] },
    };

    const { merged } = await mergeTemplatesIntoPage(template, {
      loadTemplate: async () => pageWithEdits,
      pageBlocksFields: { blocks: { allowedLayouts: ['/templates/mixed'] } },
      uuidGenerator,
    });

    // Fixed+readOnly header should have the edited content (transfers to template)
    const headerBlock = Object.values(merged.blocks).find(b => b.placeholder === 'header' && b.fixed && b.readOnly);
    expect(headerBlock).toBeDefined();
    expect(headerBlock.value[0].text).toBe('Edited ReadOnly Header');

    // Fixed+editable banner should keep ORIGINAL template content (page edits don't transfer)
    const bannerBlock = Object.values(merged.blocks).find(b => b.placeholder === 'banner' && b.fixed && !b.readOnly);
    expect(bannerBlock).toBeDefined();
    expect(bannerBlock.value[0].text).toBe('Original Editable Banner');
  });
});

describe('sequential layout switching', () => {
  let counter = 0;
  const uuidGenerator = () => `uuid-${++counter}`;

  test('fixed readOnly block uses new template content (not preserved)', async () => {
    // Source has readOnly header - content should NOT be preserved
    const pageData = {
      blocks: {
        'old-header': { '@type': 'slate', fixed: true, readOnly: true, templateId: '/templates/old', placeholder: 'header', value: [{ text: 'Old ReadOnly Header' }] },
        'user-block': { '@type': 'slate', templateId: '/templates/old', placeholder: 'default', value: [{ text: 'User' }] },
      },
      blocks_layout: { items: ['old-header', 'user-block'] },
    };

    const newTemplateData = {
      '@id': '/templates/new',
      blocks: {
        'new-header': { '@type': 'slate', fixed: true, readOnly: true, placeholder: 'header', value: [{ text: 'New ReadOnly Header' }] },
        'new-default': { '@type': 'slate', placeholder: 'default', value: [] },
      },
      blocks_layout: { items: ['new-header', 'new-default'] },
    };

    const result = await applyLayoutTemplate(pageData, newTemplateData, uuidGenerator);

    // Header should have NEW template's content (readOnly = don't preserve)
    const headerBlocks = Object.entries(result.blocks).filter(([_, b]) => b.placeholder === 'header' && b.fixed);
    expect(headerBlocks.length).toBe(1);
    expect(headerBlocks[0][1].value[0].text).toBe('New ReadOnly Header');
  });

  test('can switch from one layout to another', async () => {
    // Step 1: Start with plain page
    const pageData = {
      blocks: {
        'user-block': { '@type': 'slate', value: [{ text: 'User content' }] },
      },
      blocks_layout: { items: ['user-block'] },
    };

    // Step 2: Apply first layout (header-footer)
    const layout1 = {
      '@id': '/templates/header-footer',
      blocks: {
        'header': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Layout Header' }] },
        'default-slot': { '@type': 'slate', placeholder: 'default', value: [] },
        'footer': { '@type': 'slate', fixed: true, placeholder: 'footer', value: [{ text: 'Layout Footer' }] },
      },
      blocks_layout: { items: ['header', 'default-slot', 'footer'] },
    };

    const afterFirst = await applyLayoutTemplate(pageData, layout1, uuidGenerator);

    // Verify first layout applied
    expect(afterFirst.blocks['user-block']).toBeDefined();
    const headerBlocksAfterFirst = Object.entries(afterFirst.blocks).filter(([_, b]) => b.placeholder === 'header' && b.fixed);
    expect(headerBlocksAfterFirst.length).toBe(1);
    expect(headerBlocksAfterFirst[0][1].value[0].text).toBe('Layout Header');

    // Step 3: Apply second layout (header-only)
    const layout2 = {
      '@id': '/templates/header-only',
      blocks: {
        'header2': { '@type': 'slate', fixed: true, placeholder: 'header', value: [{ text: 'Header Only' }] },
        'default2': { '@type': 'slate', placeholder: 'default', value: [] },
      },
      blocks_layout: { items: ['header2', 'default2'] },
    };

    const afterSecond = await applyLayoutTemplate(afterFirst, layout2, uuidGenerator);

    // User content should still be preserved
    expect(afterSecond.blocks['user-block']).toBeDefined();

    // Header should preserve content from source (fixed + editable = preserve user's potential edits)
    const headerBlocksAfterSecond = Object.entries(afterSecond.blocks).filter(([_, b]) => b.placeholder === 'header' && b.fixed);
    expect(headerBlocksAfterSecond.length).toBe(1);
    expect(headerBlocksAfterSecond[0][1].value[0].text).toBe('Layout Header');

    // Old footer should be gone (no footer in new layout)
    const footerBlocks = Object.entries(afterSecond.blocks).filter(([_, b]) => b.placeholder === 'footer');
    expect(footerBlocks.length).toBe(0);

    // All blocks should have new templateId
    for (const block of Object.values(afterSecond.blocks)) {
      expect(block.templateId).toBe('/templates/header-only');
    }
  });
});
