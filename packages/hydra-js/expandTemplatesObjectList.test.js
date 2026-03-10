import { expandTemplatesSync } from './hydra.js';

describe('expandTemplatesSync: object_list arrays in template blocks', () => {
  let counter = 0;
  const uuidGenerator = () => `uuid-${++counter}`;

  beforeEach(() => {
    counter = 0;
  });

  const templateData = {
    '@id': '/templates/with-slider',
    blocks: {
      'header': {
        '@type': 'slate', fixed: true, placeholder: 'header',
        templateId: '/templates/with-slider', templateInstanceId: 'def-instance',
        value: [{ text: 'Header' }],
      },
      'slider-block': {
        '@type': 'slider', fixed: true, readOnly: true, placeholder: 'slider',
        templateId: '/templates/with-slider', templateInstanceId: 'def-instance',
        slides: [
          {
            '@id': 'tpl-slide-1', '@type': 'slide', fixed: true, readOnly: true,
            templateId: '/templates/with-slider', templateInstanceId: 'def-instance',
            title: 'Slide 1',
          },
          {
            '@id': 'tpl-slide-2', '@type': 'slide', fixed: true, readOnly: true,
            templateId: '/templates/with-slider', templateInstanceId: 'def-instance',
            title: 'Slide 2',
          },
        ],
      },
      'default-slot': {
        '@type': 'slate', placeholder: 'default',
        templateId: '/templates/with-slider', templateInstanceId: 'def-instance',
        value: [],
      },
    },
    blocks_layout: { items: ['header', 'slider-block', 'default-slot'] },
  };

  test('object_list arrays are registered in nestedContainers for nested expansion', () => {
    const pageBlocks = {
      'my-header': {
        '@type': 'slate', fixed: true,
        templateId: '/templates/with-slider', templateInstanceId: 'page-inst-1',
        value: [{ text: 'Header' }],
      },
      'my-slider': {
        '@type': 'slider', fixed: true, readOnly: true,
        templateId: '/templates/with-slider', templateInstanceId: 'page-inst-1',
        slides: [
          { '@id': 's1', '@type': 'slide', title: 'Page Slide 1',
            templateId: '/templates/with-slider', templateInstanceId: 'page-inst-1' },
          { '@id': 's2', '@type': 'slide', title: 'Page Slide 2',
            templateId: '/templates/with-slider', templateInstanceId: 'page-inst-1' },
        ],
      },
      'user-block': {
        '@type': 'slate',
        templateId: '/templates/with-slider', templateInstanceId: 'page-inst-1',
        placeholder: 'default',
        value: [{ text: 'User content' }],
      },
    };
    const pageLayout = ['my-header', 'my-slider', 'user-block'];
    const templates = { '/templates/with-slider': templateData };
    const templateState = {};

    // Step 1: Top-level expansion (like BlocksRenderer for main blocks_layout)
    const items = expandTemplatesSync(pageLayout, {
      blocks: pageBlocks,
      templates,
      templateState,
      uuidGenerator,
    });

    // Find the slider block in the result
    const sliderItem = items.find(item => item['@type'] === 'slider');
    expect(sliderItem).toBeDefined();
    expect(sliderItem.slides).toBeDefined();
    expect(sliderItem.slides.length).toBe(2);

    // The slides array should be registered in nestedContainers
    expect(templateState.nestedContainers.has(sliderItem.slides)).toBe(true);

    // Step 2: Expand the slides (like a child BlocksRenderer for the object_list)
    const slideItems = expandTemplatesSync(sliderItem.slides, {
      templates,
      templateState,
      uuidGenerator,
      idField: '@id',
    });

    // Slides should come through with correct templateId and templateInstanceId
    expect(slideItems.length).toBe(2);
    expect(slideItems[0].templateId).toBe('/templates/with-slider');
    expect(slideItems[0].templateInstanceId).toBe('page-inst-1');
    expect(slideItems[0].title).toBe('Slide 1'); // template content wins (fixed)
    expect(slideItems[1].title).toBe('Slide 2');

    // Fixed and readOnly flags should be preserved from template
    expect(slideItems[0].fixed).toBe(true);
    expect(slideItems[0].readOnly).toBe(true);
    expect(slideItems[1].fixed).toBe(true);
    expect(slideItems[1].readOnly).toBe(true);
  });
});
