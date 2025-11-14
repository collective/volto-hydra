/**
 * Standalone test for slateTransforms.applyFormat
 * Run with: node test-slate-transforms.js
 */

const slateTransforms = require('./packages/volto-hydra/src/utils/slateTransforms');

// Test data
const value = [
  {
    type: 'p',
    nodeId: 1,
    children: [
      {
        text: 'Text to make bold',
        nodeId: 2,
      },
    ],
  },
];

const selection = {
  anchor: { path: [0, 0], offset: 0 },
  focus: { path: [0, 0], offset: 17 },
};

console.log('Testing applyFormat with bold toggle...');
console.log('Input value:', JSON.stringify(value, null, 2));
console.log('Selection:', JSON.stringify(selection, null, 2));

try {
  const result = slateTransforms.applyFormat(value, selection, 'bold', 'toggle');
  console.log('\nResult:', JSON.stringify(result, null, 2));

  // Check if bold was applied
  const hasBold = result[0]?.children?.some(child => child.bold === true);
  console.log('\nBold applied?', hasBold);

  // Serialize to HTML
  const html = slateTransforms.serialize(result);
  console.log('\nSerialized HTML:', html);
  console.log('\nContains <strong>?', html.includes('<strong>'));

} catch (error) {
  console.error('Error:', error);
  console.error(error.stack);
}
