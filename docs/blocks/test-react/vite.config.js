import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Map of component names referenced as implicit globals in the example files.
 * The plugin adds import statements for these so they resolve as modules.
 */
const COMPONENT_IMPORTS = {
  SlateNode:         './SlateNode.jsx',
  BlockRenderer:     './BlockRenderer.jsx',
  SlateBlock:        './SlateBlock.jsx',
  IntroductionBlock: './IntroductionBlock.jsx',
  ListingBlock:      './ListingBlock.jsx',
  ColumnBlock:       './ColumnsBlock.jsx', // ColumnBlock is defined in ColumnsBlock.jsx
  HeroBlock:         './HeroBlock.jsx',
  ImageBlock:        './ImageBlock.jsx',
  TeaserBlock:       './TeaserBlock.jsx',
  TableBlock:        './TableBlock.jsx',
  ColumnsBlock:      './ColumnsBlock.jsx',
  GridBlock:         './GridBlock.jsx',
  AccordionBlock:    './AccordionBlock.jsx',
  SliderBlock:       './SliderBlock.jsx',
  FormBlock:         './FormBlock.jsx',
  SearchBlock:       './SearchBlock.jsx',
  HeadingBlock:      './HeadingBlock.jsx',
  SeparatorBlock:    './SeparatorBlock.jsx',
  ButtonBlock:       './ButtonBlock.jsx',
  HighlightBlock:    './HighlightBlock.jsx',
  VideoBlock:        './VideoBlock.jsx',
  TocBlock:          './TocBlock.jsx',
};

/**
 * Vite plugin to make doc example JSX files importable as modules.
 *
 * The example files in docs/blocks/examples/react/ are written as
 * documentation snippets — no imports, no exports. This plugin
 * auto-adds React imports, inter-component imports, and a default export.
 */
function reactExamplesPlugin() {
  const examplesDir = path.resolve(__dirname, '../examples/react');

  return {
    name: 'react-examples',
    transform(code, id) {
      if (!id.startsWith(examplesDir) || !id.endsWith('.jsx')) return;

      const fileName = path.basename(id);

      // Add React imports
      // Only import hooks actually used in this file (Fragment is auto-injected by React plugin for <>)
      const hooks = ['useState', 'useEffect'].filter(h => code.includes(h));
      const hookImports = hooks.length > 0 ? `, { ${hooks.join(', ')} }` : '';
      let imports = `import React${hookImports} from 'react';\n`;

      // Add imports for referenced components (skip self-imports)
      for (const [name, importPath] of Object.entries(COMPONENT_IMPORTS)) {
        const importFile = path.basename(importPath);
        if (importFile === fileName) continue;
        if (code.includes(name)) {
          imports += `import ${name} from '${importPath}';\n`;
        }
      }

      // Add expandListingBlocks reference for listing/search blocks
      if (code.includes('expandListingBlocks')) {
        imports += `const expandListingBlocks = window._expandListingBlocks;\n`;
      }

      // Find all top-level function declarations and export the first as default
      const fnNames = [];
      const fnRegex = /^function (\w+)/gm;
      let match;
      while ((match = fnRegex.exec(code)) !== null) {
        fnNames.push(match[1]);
      }

      let exports = '';
      if (fnNames.length > 0) {
        exports = `\nexport default ${fnNames[0]};\n`;
        if (fnNames.length > 1) {
          exports += fnNames.slice(1).map(n => `export { ${n} };`).join('\n') + '\n';
        }
      }

      return imports + code + exports;
    },
  };
}

export default defineConfig({
  plugins: [react(), reactExamplesPlugin()],
  resolve: {
    alias: {
      '$examples': path.resolve(__dirname, '../examples/react'),
      '$hydra': path.resolve(__dirname, '../../../packages/hydra-js/hydra.js'),
      '$schemas': path.resolve(__dirname, '../../../tests-playwright/fixtures/shared-block-schemas.js'),
    },
  },
});
