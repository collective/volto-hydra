/**
 * Block renderer for test frontend.
 * Renders blocks based on their @type.
 *
 * IMPORTANT: This renderer ONLY generates HTML markup following the Hydra specification.
 * It uses data attributes (like data-editable-field, data-node-id) to mark what SHOULD
 * be editable, but it does NOT set contenteditable attributes directly.
 *
 * The hydra.js bridge is responsible for:
 * - Reading these data attributes
 * - Setting contenteditable="true" on the appropriate elements
 * - Attaching event listeners for editing
 *
 * This separation ensures:
 * - Renderers stay simple and framework-agnostic
 * - hydra.js has full control over edit mode behavior
 * - No nested contenteditable conflicts
 */

// Global render counter for testing re-render behavior
window.hydraRenderCount = window.hydraRenderCount || 0;

// Slider state: track slide count to detect new slides { [blockId]: slideCount }
const sliderSlideCount = {};

/**
 * Extract URL from various formats and construct image URL.
 * Handles: array of objects [{@id: '/path'}], object {@id: '/path'}, or string '/path'
 * Adds @@images/image suffix for Plone paths.
 * @param {Array|Object|string} value - Image value in various formats
 * @returns {string} Image URL ready for src attribute
 */
function getImageUrl(value) {
    if (!value) return '';
    // Extract @id from array or object format
    let url = Array.isArray(value) ? value[0]?.['@id'] : value?.['@id'] || value;
    if (typeof url !== 'string') return '';
    // Add @@images/image suffix for Plone paths
    if (url.startsWith('/') && !url.includes('@@images')) {
        url = `${url}/@@images/image`;
    }
    return url;
}

/**
 * Extract URL from various formats for links.
 * Handles: array of objects [{@id: '/path'}], object {@id: '/path'}, or string '/path'
 * @param {Array|Object|string} value - Link value in various formats
 * @returns {string} Link URL
 */
function getLinkUrl(value) {
    if (!value) return '';
    // Extract @id from array or object format
    const url = Array.isArray(value) ? value[0]?.['@id'] : value?.['@id'] || value;
    return typeof url === 'string' ? url : '';
}

/**
 * Render content blocks to the DOM.
 * @param {Object} content - Content object with blocks and blocks_layout
 */
function renderContent(content) {
    // Increment render counter
    window.hydraRenderCount++;
    const counterEl = document.getElementById('render-counter');
    if (counterEl) counterEl.textContent = window.hydraRenderCount;

    const container = document.getElementById('content');
    container.innerHTML = '';

    const { blocks, blocks_layout } = content;
    if (!blocks_layout) {
        console.warn('[RENDERER] No blocks_layout in content, nothing to render');
        return;
    }
    const items = blocks_layout.items || [];

    items.forEach(blockId => {
        const block = blocks[blockId];
        if (!block) return;

        const blockElement = renderBlock(blockId, block);
        if (blockElement) {
            container.appendChild(blockElement);
        }
    });
}

/**
 * Render a single block.
 * @param {string} blockId - Block UUID
 * @param {Object} block - Block data
 * @returns {HTMLElement} Rendered block element
 */
function renderBlock(blockId, block) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-uid', blockId);

    switch (block['@type']) {
        case 'slate':
            wrapper.innerHTML = renderSlateBlock(block);
            break;
        case 'text':
            wrapper.innerHTML = renderTextBlock(block);
            break;
        case 'textarea':
            wrapper.innerHTML = renderTextareaBlock(block);
            break;
        case 'image':
            wrapper.innerHTML = renderImageBlock(block);
            break;
        case 'multifield':
            wrapper.innerHTML = renderMultiFieldBlock(block);
            break;
        case 'hero':
            wrapper.innerHTML = renderHeroBlock(block);
            break;
        case 'columns':
            wrapper.innerHTML = renderColumnsBlock(block);
            break;
        case 'column':
            wrapper.innerHTML = renderColumnBlock(block);
            break;
        case 'gridBlock':
            wrapper.innerHTML = renderGridBlock(block);
            break;
        case 'carousel':
            wrapper.classList.add('carousel-block');
            wrapper.innerHTML = renderCarouselBlock(block);
            break;
        case 'slider':
            // Slider uses object_list format (slides as array with @id)
            wrapper.classList.add('carousel-block');
            wrapper.innerHTML = renderSliderBlock(block, blockId);
            break;
        case 'slide':
            wrapper.innerHTML = renderSlideBlock(block);
            break;
        case 'accordion':
            wrapper.innerHTML = renderAccordionBlock(block);
            break;
        case 'slateTable':
            wrapper.innerHTML = renderSlateTableBlock(block);
            break;
        case 'teaser':
            wrapper.innerHTML = renderTeaserBlock(block);
            break;
        case 'empty':
            wrapper.innerHTML = renderEmptyBlock(block);
            break;
        case 'title':
            // Title block is just rendered by page title, empty here
            wrapper.innerHTML = '';
            break;
        default:
            wrapper.innerHTML = `<p>Unknown block type: ${block['@type']}</p>`;
    }

    return wrapper;
}

/**
 * Render a Slate text block.
 * @param {Object} block - Slate block data
 * @returns {string} HTML string
 */
function renderSlateBlock(block) {
    const value = block.value || [];
    let html = '';

    value.forEach((node) => {
        // nodeId is required for edit mode (hydra.js adds it), but optional for view mode
        // If missing in edit mode, hydra.js should add it - but we don't throw here to allow view mode
        const nodeIdAttr = node.nodeId !== undefined ? ` data-node-id="${node.nodeId}"` : '';

        const text = renderChildren(node.children);
        // Mark as editable field - hydra.js will read this and set contenteditable="true"

        // Render based on node type
        switch (node.type) {
            case 'p':
                html += `<p data-editable-field="value"${nodeIdAttr}>${text}</p>`;
                break;
            case 'h1':
                html += `<h1 data-editable-field="value"${nodeIdAttr}>${text}</h1>`;
                break;
            case 'h2':
                html += `<h2 data-editable-field="value"${nodeIdAttr}>${text}</h2>`;
                break;
            case 'h3':
                html += `<h3 data-editable-field="value"${nodeIdAttr}>${text}</h3>`;
                break;
            case 'h4':
                html += `<h4 data-editable-field="value"${nodeIdAttr}>${text}</h4>`;
                break;
            case 'h5':
                html += `<h5 data-editable-field="value"${nodeIdAttr}>${text}</h5>`;
                break;
            case 'h6':
                html += `<h6 data-editable-field="value"${nodeIdAttr}>${text}</h6>`;
                break;
            case 'blockquote':
                html += `<blockquote data-editable-field="value"${nodeIdAttr}>${text}</blockquote>`;
                break;
            case 'ul':
                html += `<ul data-editable-field="value"${nodeIdAttr}>${renderListItems(node.children)}</ul>`;
                break;
            case 'ol':
                html += `<ol data-editable-field="value"${nodeIdAttr}>${renderListItems(node.children)}</ol>`;
                break;
            default:
                // Fallback for unknown block types
                html += `<p data-editable-field="value"${nodeIdAttr}>${text}</p>`;
        }
    });

    return html || '<p data-editable-field="value">Empty block</p>';
}

/**
 * Render list items (li elements) for ul/ol lists.
 * Each li can contain text nodes, links, and other inline elements.
 * @param {Array} items - Array of li nodes
 * @returns {string} HTML string
 */
function renderListItems(items) {
    if (!items || !Array.isArray(items)) return '';

    return items.map(item => {
        if (item.type === 'li') {
            const nodeIdAttr = item.nodeId !== undefined ? ` data-node-id="${item.nodeId}"` : '';
            const content = renderChildren(item.children || []);
            return `<li${nodeIdAttr}>${content}</li>`;
        }
        // If not an li, render as inline content (shouldn't happen in valid Slate)
        return renderChildren([item]);
    }).join('');
}

/**
 * Recursively render Slate children nodes.
 * Handles both old format (marks) and new format (inline element nodes).
 * Uses non-standard markup to prove architectural decoupling.
 * @param {Array} children - Array of Slate nodes
 * @returns {string} HTML string
 */
function renderChildren(children) {
    return children.map(child => {
        // Handle inline element nodes (new format from toggleInlineFormat)
        // Add data-node-id for selection restoration
        if (child.type === 'strong') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            return `<span style="font-weight: bold"${nodeId}>${renderChildren(child.children)}</span>`;
        }
        if (child.type === 'em') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            return `<span style="font-style: italic"${nodeId}>${renderChildren(child.children)}</span>`;
        }
        if (child.type === 'del') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            return `<span style="text-decoration: line-through"${nodeId}>${renderChildren(child.children)}</span>`;
        }
        if (child.type === 'u') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            return `<span style="text-decoration: underline"${nodeId}>${renderChildren(child.children)}</span>`;
        }
        if (child.type === 'code') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            return `<code${nodeId}>${renderChildren(child.children)}</code>`;
        }
        if (child.type === 'link') {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            const url = child.data?.url || '#';
            return `<a href="${url}"${nodeId}>${renderChildren(child.children)}</a>`;
        }

        // Handle text nodes (leaf nodes)
        if (child.text !== undefined) {
            let content = child.text || '';

            // Also handle old format (marks) for backward compatibility
            if (child.bold) content = `<span style="font-weight: bold">${content}</span>`;
            if (child.italic) content = `<span style="font-style: italic">${content}</span>`;
            if (child.code) content = `<code>${content}</code>`;
            if (child.del) content = `<span style="text-decoration: line-through">${content}</span>`;

            return content;
        }

        // Unknown node type - render children if present, otherwise return empty
        if (child.children) {
            const nodeId = child.nodeId !== undefined ? ` data-node-id="${child.nodeId}"` : '';
            console.warn(`Unknown Slate node type: ${child.type}, rendering children`);
            return `<span${nodeId}>${renderChildren(child.children)}</span>`;
        }

        return '';
    }).join('');
}

/**
 * Render a simple text block (non-Slate).
 * @param {Object} block - Text block data
 * @returns {string} HTML string
 */
function renderTextBlock(block) {
    const text = block.text || '';
    // Mark as editable field - hydra.js will read this and set contenteditable="true"
    // No data-node-id needed for simple text blocks
    return `<div data-editable-field="text">${text}</div>`;
}

/**
 * Render a textarea block (multiline text, non-Slate).
 * @param {Object} block - Textarea block data
 * @returns {string} HTML string
 */
function renderTextareaBlock(block) {
    const content = block.content || '';
    // Mark as editable field - hydra.js will read this and set contenteditable="true"
    // No data-node-id needed for textarea blocks
    // Preserve newlines by replacing \n with <br> for display (hydra.js will convert back to \n when sending)
    const displayContent = content.replace(/\n/g, '<br>');
    return `<div data-editable-field="content">${displayContent}</div>`;
}

/**
 * Render a multi-field block (with both text and slate fields).
 * @param {Object} block - Multi-field block data
 * @returns {string} HTML string
 */
function renderMultiFieldBlock(block) {
    const title = block.title || '';
    const description = block.description || [];

    let html = `<div data-editable-field="title">${title}</div>`;

    // Render description as slate field
    description.forEach((node) => {
        if (node.type === 'p') {
            // nodeId is optional for view mode
            const nodeIdAttr = node.nodeId !== undefined ? ` data-node-id="${node.nodeId}"` : '';
            const text = renderChildren(node.children);
            html += `<p data-editable-field="description"${nodeIdAttr}>${text}</p>`;
        }
    });

    return html;
}

/**
 * Render a hero block with multiple editable text fields.
 * Tests all field types: string (heading, buttonText), textarea (subheading), slate (description)
 * @param {Object} block - Hero block data
 * @returns {string} HTML string
 */
function renderHeroBlock(block) {
    const heading = block.heading || '';
    const subheading = block.subheading || '';
    const buttonText = block.buttonText || '';
    const buttonLink = getLinkUrl(block.buttonLink);
    const imageSrc = getImageUrl(block.image);
    const description = block.description || [{ type: 'p', children: [{ text: '' }] }];

    // Render subheading as textarea (preserve newlines)
    const subheadingHtml = subheading.replace(/\n/g, '<br>');

    // Render description as slate field
    let descriptionHtml = '';
    description.forEach((node) => {
        const nodeIdAttr = node.nodeId !== undefined ? ` data-node-id="${node.nodeId}"` : '';
        const text = renderChildren(node.children);
        switch (node.type) {
            case 'h1':
                descriptionHtml += `<h1 data-editable-field="description"${nodeIdAttr}>${text}</h1>`;
                break;
            case 'h2':
                descriptionHtml += `<h2 data-editable-field="description"${nodeIdAttr}>${text}</h2>`;
                break;
            case 'p':
            default:
                descriptionHtml += `<p data-editable-field="description"${nodeIdAttr}>${text}</p>`;
        }
    });

    // Image with data-media-field for inline image selection
    const imageHtml = imageSrc
        ? `<img data-media-field="image" src="${imageSrc}" alt="Hero image" style="max-width: 100%; height: auto; margin-bottom: 10px;" />`
        : `<div data-media-field="image" style="width: 100%; height: 150px; background: #e5e5e5; margin-bottom: 10px; border-radius: 4px;"></div>`;

    return `
        <div class="hero-block" style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
            ${imageHtml}
            <h1 data-editable-field="heading">${heading}</h1>
            <p data-editable-field="subheading" style="font-size: 1.2em; color: #666;">${subheadingHtml}</p>
            <div class="hero-description" style="margin: 10px 0;">${descriptionHtml}</div>
            <a data-editable-field="buttonText" data-linkable-field="buttonLink" href="${buttonLink}" style="display: inline-block; padding: 10px 20px; background: #007eb1; color: white; text-decoration: none; border-radius: 4px; cursor: pointer;">${buttonText}</a>
        </div>
    `;
}

/**
 * Render a teaser block.
 * Shows placeholder when href is empty, content when href has value.
 * By default, shows target page title/description from href.
 * Only uses block.title/description when overrideTitle/overrideDescription is true.
 * @param {Object} block - Teaser block data
 * @returns {string} HTML string
 */
function renderTeaserBlock(block) {
    const href = getLinkUrl(block.href);
    const hrefObj = Array.isArray(block.href) && block.href.length > 0 ? block.href[0] : null;

    // Get title: use block.title only if overwrite is true, otherwise use href title
    const title = block.overwrite && block.title
        ? block.title
        : (hrefObj?.title || '');

    // Get description: use block.description only if overwrite is true, otherwise use href description
    const description = block.overwrite && block.description
        ? block.description
        : (hrefObj?.description || '');

    // Get preview image: use block.preview_image if set, otherwise use target content's image
    let imageSrc = '';
    if (block.preview_image) {
        imageSrc = getImageUrl(block.preview_image);
    } else if (hrefObj?.hasPreviewImage && hrefObj?.['@id']) {
        // Target content has a preview image - construct URL from target path
        imageSrc = hrefObj['@id'] + '/@@images/preview_image';
    }

    // If href is empty, show placeholder for starter UI
    if (!href) {
        return `
            <div class="teaser-block teaser-placeholder" style="padding: 40px 20px; background: #f5f5f5; border: 2px dashed #ccc; border-radius: 8px; text-align: center; min-height: 150px; display: flex; align-items: center; justify-content: center;">
                <p style="color: #999; margin: 0;">Select a target page for this teaser</p>
            </div>
        `;
    }

    // Show teaser content when href has value
    const imageHtml = imageSrc
        ? `<img src="${imageSrc}" alt="" style="max-width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;" />`
        : '';

    // Only add data-editable-field when overwrite is true (field is customizable)
    const titleAttr = block.overwrite ? 'data-editable-field="title"' : '';
    const descAttr = block.overwrite ? 'data-editable-field="description"' : '';

    return `
        <div class="teaser-block" style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
            ${imageHtml}
            <h3 ${titleAttr} style="margin: 0 0 10px 0;">${title}</h3>
            <p ${descAttr} style="color: #666; margin: 0;">${description}</p>
            <a href="${href}" data-linkable-field="href" style="display: inline-block; margin-top: 10px; color: #007eb1; text-decoration: none;">Read more →</a>
        </div>
    `;
}

/**
 * Render an image block.
 * @param {Object} block - Image block data
 * @returns {string} HTML string
 */
function renderImageBlock(block) {
    const imageSrc = getImageUrl(block.url);
    const alt = block.alt || '';
    const href = getLinkUrl(block.href);

    // Add data-media-field="url" for inline image editing
    // Add data-linkable-field="href" for inline link editing
    const img = `<img data-media-field="url" data-linkable-field="href" src="${imageSrc}" alt="${alt}" />`;

    // If href is set, wrap in link - tests that click behavior is prevented in edit mode
    if (href) {
        return `<a href="${href}" class="image-link">${img}</a>`;
    }
    return img;
}

/**
 * Render a columns container block.
 * Has TWO container fields: top_images and columns (tests multi-field routing)
 * @param {Object} block - Columns block data with top_images/top_images_layout and columns/columns_layout
 * @returns {string} HTML string
 */
function renderColumnsBlock(block) {
    const topImages = block.top_images || {};
    const topImagesLayout = block.top_images_layout || { items: [] };
    const topImagesItems = topImagesLayout.items || [];
    const columns = block.columns || {};
    const columnsLayout = block.columns_layout || { items: [] };
    const columnsItems = columnsLayout.items || [];
    const title = block.title || '';

    let html = '';

    // Render editable title for columns block
    if (title) {
        html += `<h3 data-editable-field="title" class="columns-title" style="margin-bottom: 10px;">${title}</h3>`;
    }

    // Render top_images container field (images go right)
    if (topImagesItems.length > 0) {
        html += '<div class="top-images-row" data-block-field="top_images" style="display: flex; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">';
        html += '<div class="field-label" style="font-weight: bold; color: #666; font-size: 12px; writing-mode: vertical-rl; text-orientation: mixed;">TOP IMAGES</div>';

        topImagesItems.forEach(imgId => {
            const img = topImages[imgId];
            if (!img) return;

            // Render image as a nested block with data-block-uid and data-block-add="right"
            html += `<div data-block-uid="${imgId}" data-block-add="right" class="top-image" style="flex: 0 0 auto;">`;
            html += renderImageBlock(img);
            html += '</div>';
        });

        html += '</div>';
    }

    // Render columns container field (columns go right)
    html += '<div class="columns-row" data-block-field="columns" style="display: flex; gap: 20px;">';

    columnsItems.forEach(columnId => {
        const column = columns[columnId];
        if (!column) return;

        // Render column as a nested block with data-block-uid and data-block-add="right"
        html += `<div data-block-uid="${columnId}" data-block-add="right" class="column" style="flex: 1; padding: 10px; border: 1px dashed #ccc;">`;
        html += renderColumnContent(column);
        html += '</div>';
    });

    html += '</div>';
    return html;
}

/**
 * Render a column block content (the content blocks inside a column).
 * Content blocks go down (data-block-add="bottom").
 * @param {Object} column - Column block data with blocks/blocks_layout
 * @returns {string} HTML string
 */
function renderColumnContent(column) {
    const blocks = column.blocks || {};
    const blocksLayout = column.blocks_layout || { items: [] };
    const items = blocksLayout.items || [];
    const title = column.title || '';

    let html = '';

    // Render editable title for column block
    if (title) {
        html += `<h4 data-editable-field="title" class="column-title" style="margin-bottom: 8px; font-size: 14px;">${title}</h4>`;
    }

    items.forEach(blockId => {
        const block = blocks[blockId];
        if (!block) return;

        // Render nested content block with data-block-uid and data-block-add="bottom"
        html += `<div data-block-uid="${blockId}" data-block-add="bottom">`;

        // Render inner content based on block type
        switch (block['@type']) {
            case 'slate':
                html += renderSlateBlock(block);
                break;
            case 'image':
                html += renderImageBlock(block);
                break;
            default:
                html += `<p>Unknown block type: ${block['@type']}</p>`;
        }

        html += '</div>';
    });

    return html || '<p style="color: #999;">Empty column</p>';
}

/**
 * Render a column block (standalone, if needed).
 * @param {Object} block - Column block data
 * @returns {string} HTML string
 */
function renderColumnBlock(block) {
    return renderColumnContent(block);
}

/**
 * Render a grid block (Volto's built-in container).
 * NO explicit data-block-add attributes - tests automatic direction inference.
 * @param {Object} block - Grid block data with blocks/blocks_layout
 * @returns {string} HTML string
 */
function renderGridBlock(block) {
    const blocks = block.blocks || {};
    const blocksLayout = block.blocks_layout || { items: [] };
    const items = blocksLayout.items || [];

    let html = '<div class="grid-row" style="display: flex; gap: 20px;">';

    items.forEach(blockId => {
        const childBlock = blocks[blockId];
        if (!childBlock) return;

        // Render grid cell WITHOUT data-block-add attribute
        // This tests that hydra.js correctly infers direction from nesting depth
        html += `<div data-block-uid="${blockId}" class="grid-cell" style="flex: 1; padding: 10px; border: 1px dashed #999;">`;

        // Render inner content based on block type
        switch (childBlock['@type']) {
            case 'slate':
                html += renderSlateBlock(childBlock);
                break;
            case 'image':
                html += renderImageBlock(childBlock);
                break;
            case 'empty':
                html += renderEmptyBlock(childBlock);
                break;
            default:
                html += `<p>Unknown block type: ${childBlock['@type']}</p>`;
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

/**
 * Render a carousel container block.
 * Carousel shows ONE slide at a time - others are hidden.
 * Has prev/next buttons with data-block-selector for navigation.
 *
 * When admin selects a hidden slide, hydra.js should click the appropriate
 * data-block-selector element to bring that slide into view.
 *
 * @param {Object} block - Carousel block data with slides/slides_layout
 * @returns {string} HTML string
 */
function renderCarouselBlock(block) {
    const slides = block.slides || {};
    const slidesLayout = block.slides_layout || { items: [] };
    const items = slidesLayout.items || [];

    // Track which slide is currently active (first by default)
    const activeSlideId = items[0] || null;

    let html = '<div class="carousel-container" style="position: relative; padding: 20px; background: #f5f5f5; border-radius: 8px; min-height: 120px;">';

    // Navigation button - Previous (selects previous sibling)
    html += '<button data-block-selector="-1" class="carousel-prev" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">←</button>';

    // Slides container - only ONE slide visible at a time
    html += '<div class="slides-wrapper" style="position: relative; margin: 0 50px; min-height: 80px;">';

    items.forEach((slideId, index) => {
        const slide = slides[slideId];
        if (!slide) return;

        // Only first slide is visible, others are hidden
        const isActive = slideId === activeSlideId;
        const displayStyle = isActive ? 'block' : 'none';

        // Render slide as nested block - hidden slides still have data-block-uid
        html += `<div data-block-uid="${slideId}" data-block-add="right" class="slide ${isActive ? 'active' : ''}" style="display: ${displayStyle}; padding: 15px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;
        html += renderSlideBlock(slide);
        html += '</div>';
    });

    html += '</div>';

    // Navigation button - Next (selects next sibling)
    html += '<button data-block-selector="+1" class="carousel-next" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">→</button>';

    // Direct selector buttons for each slide (like dot indicators)
    // Only show dots for first half of slides to test both direct selector and +1/-1 fallback
    const halfLength = Math.ceil(items.length / 2);
    html += '<div class="slide-indicators" style="text-align: center; margin-top: 10px;">';
    items.forEach((slideId, index) => {
        if (index < halfLength) {
            // First half: show direct selector dot
            html += `<button data-block-selector="${slideId}" class="slide-dot" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; cursor: pointer; border: 1px solid #999; background: ${slideId === activeSlideId ? '#333' : '#fff'};">${index + 1}</button>`;
        } else {
            // Second half: no direct selector, must use +1/-1 navigation
            html += `<span class="slide-dot no-selector" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; display: inline-block; border: 1px solid #ccc; background: ${slideId === activeSlideId ? '#333' : '#eee'};">${index + 1}</span>`;
        }
    });
    html += '</div>';

    html += '</div>';
    return html;
}

/**
 * Render a slider block using object_list format (slides as array with @id).
 * This is the volto-slider-block format.
 *
 * @param {Object} block - Slider block data with slides array
 * @param {string} blockId - Block UID for state tracking
 * @returns {string} HTML string
 */
function renderSliderBlock(block, blockId) {
    const slides = block.slides || [];
    const prevCount = sliderSlideCount[blockId] || 0;
    const newCount = slides.length;

    // Detect if a new slide was added - show it instead of first slide
    let activeIndex = 0;
    if (newCount > prevCount && prevCount > 0) {
        activeIndex = newCount - 1; // New slide is at the end
    }
    sliderSlideCount[blockId] = newCount;

    const activeSlideId = slides[activeIndex]?.['@id'] || null;

    let html = '<div class="carousel-container" style="position: relative; padding: 20px; background: #f5f5f5; border-radius: 8px; min-height: 120px;">';

    // Navigation button - Previous (selects previous sibling)
    html += '<button data-block-selector="-1" class="carousel-prev" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">←</button>';

    // Slides container - only ONE slide visible at a time
    html += '<div class="slides-wrapper" style="position: relative; margin: 0 50px; min-height: 80px;">';

    slides.forEach((slide, index) => {
        const slideId = slide['@id'];
        if (!slideId) return;

        // Only first slide is visible, others are hidden
        const isActive = slideId === activeSlideId;
        const displayStyle = isActive ? 'block' : 'none';

        // Render slide as nested block - hidden slides still have data-block-uid
        html += `<div data-block-uid="${slideId}" data-block-add="right" class="slide ${isActive ? 'active' : ''}" style="display: ${displayStyle}; padding: 15px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;
        html += renderSlideBlock(slide);
        html += '</div>';
    });

    html += '</div>';

    // Navigation button - Next (selects next sibling)
    html += '<button data-block-selector="+1" class="carousel-next" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">→</button>';

    // Direct selector buttons for each slide (like dot indicators)
    // Only show dots for first half of slides to test both direct selector and +1/-1 fallback
    const halfLength = Math.ceil(slides.length / 2);
    html += '<div class="slide-indicators" style="text-align: center; margin-top: 10px;">';
    slides.forEach((slide, index) => {
        const slideId = slide['@id'];
        if (index < halfLength) {
            // First half: show direct selector dot
            html += `<button data-block-selector="${slideId}" class="slide-dot" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; cursor: pointer; border: 1px solid #999; background: ${slideId === activeSlideId ? '#333' : '#fff'};">${index + 1}</button>`;
        } else {
            // Second half: no direct selector, must use +1/-1 navigation
            html += `<span class="slide-dot no-selector" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; display: inline-block; border: 1px solid #ccc; background: ${slideId === activeSlideId ? '#333' : '#eee'};">${index + 1}</span>`;
        }
    });
    html += '</div>';

    html += '</div>';
    return html;
}

/**
 * Render a slide block (child of carousel/slider).
 * Supports both old format (title, content) and volto-slider-block format (title, description, head_title).
 * @param {Object} block - Slide block data
 * @returns {string} HTML string
 */
function renderSlideBlock(block) {
    const title = block.title ?? '';
    // Support both old format (content) and new format (description)
    const description = block.description || block.content || '';
    const headTitle = block.head_title || '';
    const imageSrc = getImageUrl(block.preview_image);

    let html = '';

    // Preview image (background image area)
    if (imageSrc) {
        html += `<div data-media-field="preview_image" style="height: 100px; background: url('${imageSrc}') center/cover; margin-bottom: 8px; border-radius: 4px;"></div>`;
    } else {
        html += `<div data-media-field="preview_image" style="height: 100px; background: #ddd; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; border-radius: 4px; cursor: pointer;">Click to add image</div>`;
    }

    if (headTitle) {
        html += `<div data-editable-field="head_title" style="font-size: 12px; color: #888; margin-bottom: 4px;">${headTitle}</div>`;
    }
    html += `<h4 data-editable-field="title" style="margin: 0 0 8px 0;">${title}</h4>`;
    html += `<p data-editable-field="description" style="margin: 0; color: #666;">${description}</p>`;

    return html;
}

/**
 * Render an accordion block with separate header and content container fields.
 * This demonstrates data-block-field for multi-container targeting.
 *
 * @param {Object} block - Accordion block data with header/header_layout and content/content_layout
 * @returns {string} HTML string
 */
function renderAccordionBlock(block) {
    const header = block.header || {};
    const headerLayout = block.header_layout?.items || [];
    const content = block.content || {};
    const contentLayout = block.content_layout?.items || [];

    let html = '<div class="accordion-container" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">';

    // Header section - uses 'header' container field
    html += '<div class="accordion-header" data-block-field="header" style="background: #f5f5f5; padding: 15px; border-bottom: 1px solid #ddd;">';
    html += '<div class="header-label" style="font-weight: bold; margin-bottom: 8px; color: #666; font-size: 12px;">HEADER</div>';

    headerLayout.forEach(blockId => {
        const childBlock = header[blockId];
        if (childBlock) {
            html += `<div data-block-uid="${blockId}" data-block-add="bottom">`;
            html += renderNestedSlateBlock(childBlock);
            html += '</div>';
        }
    });

    html += '</div>';

    // Content section - uses 'content' container field
    html += '<div class="accordion-content" data-block-field="content" style="padding: 15px;">';
    html += '<div class="content-label" style="font-weight: bold; margin-bottom: 8px; color: #666; font-size: 12px;">CONTENT</div>';

    contentLayout.forEach(blockId => {
        const childBlock = content[blockId];
        if (childBlock) {
            html += `<div data-block-uid="${blockId}" data-block-add="bottom">`;
            html += renderNestedSlateBlock(childBlock);
            html += '</div>';
        }
    });

    html += '</div>';

    html += '</div>';
    return html;
}

/**
 * Render a nested slate block (simple paragraph rendering).
 * Used for accordion's nested text blocks.
 *
 * @param {Object} block - Slate block data
 * @returns {string} HTML string
 */
function renderNestedSlateBlock(block) {
    const plaintext = block.plaintext || '';
    return `<p data-editable-field="value" style="margin: 0;">${plaintext}</p>`;
}

/**
 * Render a slateTable block.
 * Each row and cell gets data-block-uid for selection.
 * Cell content is editable via data-editable-field="value".
 * @param {Object} block - slateTable block data
 * @returns {string} HTML string
 */
function renderSlateTableBlock(block) {
    const table = block.table || {};
    const rows = table.rows || [];

    let html = '<table style="border-collapse: collapse; width: 100%;">';

    rows.forEach((row) => {
        // Rows add downward (new row below)
        html += `<tr data-block-uid="${row.key}" data-block-add="bottom">`;
        const cells = row.cells || [];
        cells.forEach((cell) => {
            const tag = cell.type === 'header' ? 'th' : 'td';
            const style = 'border: 1px solid #ccc; padding: 8px;';

            // Render cell content from slate value
            let cellContent = '';
            const value = cell.value || [];
            value.forEach((node) => {
                const nodeIdAttr = node.nodeId !== undefined ? ` data-node-id="${node.nodeId}"` : '';
                const text = renderChildren(node.children || []);
                cellContent += `<p data-editable-field="value"${nodeIdAttr}>${text}</p>`;
            });

            // Cells add to the right (new column)
            html += `<${tag} data-block-uid="${cell.key}" data-block-add="right" style="${style}">${cellContent}</${tag}>`;
        });
        html += '</tr>';
    });

    html += '</table>';
    return html;
}

/**
 * Render an Empty block.
 * Empty blocks are inserted into empty containers and can be clicked to add a real block.
 * @param {Object} block - Empty block data
 * @returns {string} HTML string
 */
function renderEmptyBlock(block) {
    return `<div class="empty-block" style="min-height: 60px;"></div>`;
}

/**
 * Update a block's content.
 * @param {string} blockId - Block UUID
 * @param {Object} newData - New block data
 */
function updateBlock(blockId, newData) {
    const blockElement = document.querySelector(`[data-block-uid="${blockId}"]`);
    if (!blockElement) return;

    const newBlock = renderBlock(blockId, newData);
    blockElement.innerHTML = newBlock.innerHTML;
}

/**
 * Add a new block to the layout.
 * @param {string} blockId - Block UUID
 * @param {Object} blockData - Block data
 * @param {number} index - Position to insert
 */
function addBlock(blockId, blockData, index) {
    const container = document.getElementById('content');
    const blockElement = renderBlock(blockId, blockData);

    if (index >= container.children.length) {
        container.appendChild(blockElement);
    } else {
        const referenceNode = container.children[index];
        container.insertBefore(blockElement, referenceNode);
    }
}

/**
 * Remove a block from the layout.
 * @param {string} blockId - Block UUID
 */
function removeBlock(blockId) {
    const blockElement = document.querySelector(`[data-block-uid="${blockId}"]`);
    if (blockElement) {
        blockElement.remove();
    }
}

/**
 * Initialize carousel navigation handlers.
 * This is called after rendering to attach click handlers to data-block-selector elements.
 * Handles:
 * - data-block-selector="+1" - show next sibling slide
 * - data-block-selector="-1" - show previous sibling slide
 * - data-block-selector="{uid}" - show slide with that specific UID
 */
function initCarouselNavigation() {
    // Use event delegation on the content container
    const content = document.getElementById('content');
    if (!content) return;

    content.addEventListener('click', function(event) {
        const selectorElement = event.target.closest('[data-block-selector]');
        if (!selectorElement) return;

        const selector = selectorElement.getAttribute('data-block-selector');
        console.log('[RENDERER] Carousel navigation click:', selector);
        const carousel = selectorElement.closest('[data-block-uid].carousel-block');
        console.log('[RENDERER] Found carousel:', carousel?.getAttribute('data-block-uid'));
        if (!carousel) return;

        // Find all slides in this carousel
        const slidesWrapper = carousel.querySelector('.slides-wrapper');
        console.log('[RENDERER] slidesWrapper:', slidesWrapper ? 'found' : 'NOT FOUND');
        if (!slidesWrapper) return;

        const slides = Array.from(slidesWrapper.querySelectorAll('[data-block-uid].slide'));
        console.log('[RENDERER] slides found:', slides.length, slides.map(s => s.getAttribute('data-block-uid')));
        if (slides.length === 0) return;

        // Find currently active slide
        const currentSlide = slides.find(s => s.style.display !== 'none') || slides[0];
        const currentIndex = slides.indexOf(currentSlide);
        console.log('[RENDERER] currentSlide:', currentSlide?.getAttribute('data-block-uid'), 'index:', currentIndex);

        let targetSlide = null;
        let targetIndex = -1;

        if (selector === '+1') {
            targetIndex = currentIndex + 1;
            if (targetIndex < slides.length) {
                targetSlide = slides[targetIndex];
            }
        } else if (selector === '-1') {
            targetIndex = currentIndex - 1;
            if (targetIndex >= 0) {
                targetSlide = slides[targetIndex];
            }
        } else {
            // Direct UID selector
            targetSlide = slides.find(s => s.getAttribute('data-block-uid') === selector);
            targetIndex = slides.indexOf(targetSlide);
        }

        console.log('[RENDERER] targetSlide:', targetSlide?.getAttribute('data-block-uid'), 'index:', targetIndex);
        if (targetSlide && targetSlide !== currentSlide) {
            console.log('[RENDERER] Scheduling slide transition in 100ms');
            // Simulate animation delay (100ms) to test async waiting in hydra.js
            setTimeout(() => {
                console.log('[RENDERER] Executing slide transition to:', targetSlide?.getAttribute('data-block-uid'));
                // Hide all slides
                slides.forEach(s => {
                    s.style.display = 'none';
                    s.classList.remove('active');
                });
                // Show target slide
                targetSlide.style.display = 'block';
                targetSlide.classList.add('active');
                console.log('[RENDERER] Slide transition complete, slide-2 display:', targetSlide.style.display);

                // Update dot indicators
                const dots = carousel.querySelectorAll('.slide-dot');
                dots.forEach((dot, i) => {
                    dot.style.background = i === targetIndex ? '#333' : '#fff';
                });
            }, 100);
        }
    });
}

// Initialize carousel navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarouselNavigation);
} else {
    initCarouselNavigation();
}
