import { buildBlockPathMap } from './buildBlockPathMap.js';

/**
 * Template-context bug: picking a type for a seeded empty form field leaves it empty — but ONLY
 * inside a forced template (the normal-page e2e is green). There is no per-edit forward re-merge
 * in View.jsx, so the reset isn't a re-merge. onMutateBlock writes the picked type via setBlockType
 * only when blockPathMap[id].typeField is set; otherwise it writes @type, which the form ignores,
 * so field_type stays 'empty'. This pins the one uncovered axis: does a form field NESTED IN A
 * TEMPLATE INSTANCE still carry its typeField in the path map?
 */
describe('template-instance form field keeps its typeField in the blockPathMap', () => {
  const blocksConfig = {
    form: {
      id: 'form',
      blockSchema: {
        properties: {
          subblocks: {
            widget: 'object_list',
            idField: 'field_id',
            typeField: 'field_type',
            allowedBlocks: ['text', 'from'],
          },
        },
      },
    },
  };
  const page = (formExtra, fieldExtra) => ({
    '@type': 'Document',
    blocks: {
      'form-1': {
        '@type': 'form',
        ...formExtra,
        subblocks: [{ field_id: 'fld-1', field_type: 'empty', ...fieldExtra }],
      },
    },
    blocks_layout: { items: ['form-1'] },
  });

  test('control: a normal form field gets typeField (this is the case the e2e proves works)', () => {
    expect(buildBlockPathMap(page({}, {}), blocksConfig)['fld-1']?.typeField).toBe('field_type');
  });

  test('a form field inside a template instance ALSO gets typeField (else the pick writes @type, not field_type)', () => {
    const map = buildBlockPathMap(
      page(
        { templateInstanceId: 'inst-1', templateId: '/templates/x', slotId: 'form-1', fixed: true },
        { templateInstanceId: 'inst-1', fixed: true },
      ),
      blocksConfig,
    );
    expect(map['fld-1']?.typeField).toBe('field_type');
  });
});
