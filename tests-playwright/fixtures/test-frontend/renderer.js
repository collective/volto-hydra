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
 * Handles:
 * - Catalog brain: { '@id': '/path', image_field: 'image', image_scales: { image: [{ download: '@@images/...' }] } }
 * - Array: [{ '@id': '/path' }]
 * - Object: { '@id': '/path' }
 * - String: '/path'
 * @param {Array|Object|string} value - Image value in various formats
 * @returns {string} Image URL ready for src attribute
 */
function getImageUrl(value) {
    if (!value) return '';

    // Handle catalog brain format from expandListingBlocks
    // { '@id': '/content-path', image_field: 'image', image_scales: { image: [{ download: '@@images/...' }] } }
    if (value.image_scales && value.image_field) {
        const field = value.image_field;
        const scales = value.image_scales[field];
        if (scales?.[0]?.download) {
            // download is relative like "@@images/image-800-hash.svg"
            // Prepend the content @id to make it absolute
            const baseUrl = value['@id'] || '';
            return `${baseUrl}/${scales[0].download}`;
        }
    }

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
 * @param {Object} content - Content object with items array (each item has @uid and @type)
 */
async function renderContent(content) {
    // Increment render counter
    window.hydraRenderCount++;
    const counterEl = document.getElementById('render-counter');
    if (counterEl) counterEl.textContent = window.hydraRenderCount;

    const container = document.getElementById('content');
    container.innerHTML = '';

    const { items } = content;
    if (!items) {
        // Expected for non-block content types (Image, File, etc.)
        return;
    }

    for (const item of items) {
        // Pass @uid as blockId - this becomes data-block-uid
        const blockElement = await renderBlock(item['@uid'], item);
        if (blockElement) {
            container.appendChild(blockElement);
        }
    }
}

/**
 * Render a single block.
 * @param {string} blockId - Block UID (used for data-block-uid attribute)
 * @param {Object} block - Block data
 * @returns {Promise<HTMLElement>} Rendered block element
 */
async function renderBlock(blockId, block) {
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
        case 'video':
            wrapper.innerHTML = renderVideoBlock(block);
            break;
        case 'multifield':
            wrapper.innerHTML = renderMultiFieldBlock(block);
            break;
        case 'hero':
            // Hero uses comment syntax instead of data attributes
            // This tests the hydra comment parser with selectors
            const heroFragment = document.createDocumentFragment();
            // Comment specifies block-uid and field selectors
            const heroComment = document.createComment(` hydra block-uid=${blockId} editable-field=heading(.hero-heading) editable-field=subheading(.hero-subheading) media-field=image(.hero-image) editable-field=buttonText(.hero-button) linkable-field=buttonLink(.hero-button) `);
            heroFragment.appendChild(heroComment);
            const heroEl = document.createElement('div');
            heroEl.innerHTML = renderHeroBlockClean(block);
            heroFragment.appendChild(heroEl.firstElementChild);
            heroFragment.appendChild(document.createComment(' /hydra '));
            return heroFragment;

        case 'columns':
            wrapper.innerHTML = await renderColumnsBlock(block);
            break;
        case 'column':
            wrapper.innerHTML = renderColumnBlock(block);
            break;
        case 'gridBlock':
            wrapper.innerHTML = await renderGridBlock(block, blockId);
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
            wrapper.innerHTML = await renderAccordionBlock(block, blockId);
            break;
        case 'slateTable':
            wrapper.innerHTML = renderSlateTableBlock(block);
            break;
        case 'search':
            wrapper.innerHTML = await renderSearchBlock(block, blockId);
            break;
        case 'teaser':
            // Teaser handles its own data-block-uid, so return it directly
            const teaserEl = document.createElement('div');
            teaserEl.innerHTML = renderTeaserBlock(block, blockId);
            return teaserEl.firstElementChild;
        case 'defaultItem':
            const defaultEl = document.createElement('div');
            defaultEl.innerHTML = renderDefaultItemBlock(block, blockId);
            return defaultEl.firstElementChild;
        case 'summaryItem':
            const summaryEl = document.createElement('div');
            summaryEl.innerHTML = renderSummaryItemBlock(block, blockId);
            return summaryEl.firstElementChild;
        // Note: listing blocks are expanded by expandListingBlocks() into individual
        // teaser/image blocks BEFORE rendering, so 'listing' case should never be hit
        case 'skiplogicTest':
            wrapper.innerHTML = renderSkiplogicTestBlock(block);
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
    // Ensure subheading is a string (might be object from conversion)
    const subheading = typeof block.subheading === 'string' ? block.subheading : '';
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
 * Render a hero block WITHOUT data attributes (for comment syntax testing).
 * Uses CSS classes instead of data-* attributes - hydra comment will add them.
 * @param {Object} block - Hero block data
 * @returns {string} HTML string
 */
function renderHeroBlockClean(block) {
    const heading = block.heading || '';
    // Ensure subheading is a string (might be object from conversion)
    const subheading = typeof block.subheading === 'string' ? block.subheading : '';
    const buttonText = block.buttonText || '';
    const buttonLink = getLinkUrl(block.buttonLink);
    const imageSrc = getImageUrl(block.image);
    const description = block.description || [{ type: 'p', children: [{ text: '' }] }];

    // Render subheading as textarea (preserve newlines)
    const subheadingHtml = subheading.replace(/\n/g, '<br>');

    // Render description - still needs node IDs for slate editing
    let descriptionHtml = '';
    description.forEach((node) => {
        const nodeIdAttr = node.nodeId !== undefined ? ` data-node-id="${node.nodeId}"` : '';
        const text = renderChildren(node.children);
        switch (node.type) {
            case 'h1':
                descriptionHtml += `<h1 class="hero-description-node" data-editable-field="description"${nodeIdAttr}>${text}</h1>`;
                break;
            case 'h2':
                descriptionHtml += `<h2 class="hero-description-node" data-editable-field="description"${nodeIdAttr}>${text}</h2>`;
                break;
            case 'p':
            default:
                descriptionHtml += `<p class="hero-description-node" data-editable-field="description"${nodeIdAttr}>${text}</p>`;
        }
    });

    // Image - uses class instead of data-media-field
    const imageHtml = imageSrc
        ? `<img class="hero-image" src="${imageSrc}" alt="Hero image" style="max-width: 100%; height: auto; margin-bottom: 10px;" />`
        : `<div class="hero-image" style="width: 100%; height: 150px; background: #e5e5e5; margin-bottom: 10px; border-radius: 4px;"></div>`;

    // No data-* attributes on fields - comment syntax will add them via selectors
    return `
        <div class="hero-block" style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
            ${imageHtml}
            <h1 class="hero-heading">${heading}</h1>
            <p class="hero-subheading" style="font-size: 1.2em; color: #666;">${subheadingHtml}</p>
            <div class="hero-description" style="margin: 10px 0;">${descriptionHtml}</div>
            <a class="hero-button" href="${buttonLink}" style="display: inline-block; padding: 10px 20px; background: #007eb1; color: white; text-decoration: none; border-radius: 4px; cursor: pointer;">${buttonText}</a>
        </div>
    `;
}

/**
 * Render a teaser block.
 * Shows placeholder when href is empty, content when href has value.
 * By default, shows target page title/description from href.
 * Only uses block.title/description when overwrite is true.
 *
 * For listing items, hydra.js uses the readonly registry (set by expandListingBlocks)
 * to determine if fields should be editable.
 *
 * @param {Object} block - Teaser block data
 * @param {string|null} blockUid - Block UID (null if inside a container with its own UID)
 * @returns {string} HTML string (includes wrapper with data-block-uid)
 */
function renderTeaserBlock(block, blockUid) {
    const hrefObj = Array.isArray(block.href) && block.href.length > 0 ? block.href[0] : null;

    // Determine whether to use block data or hrefObj data for ALL fields (no mixing)
    // - overwrite=true: user wants custom data → use block data
    // - overwrite=false but hrefObj has no content data: use block data (e.g., listing items)
    // - overwrite=false and hrefObj has content data: use hrefObj data (object browser selection)
    const hrefObjHasContentData = hrefObj?.title !== undefined;
    const useBlockData = block.overwrite || !hrefObjHasContentData;

    // Get href: always from hrefObj @id (link destination)
    const href = hrefObj?.['@id'] || '';

    // Get title/description/image based on useBlockData (all or nothing, no mixing)
    const title = useBlockData ? (block.title || '') : (hrefObj?.title || '');
    const description = useBlockData ? (block.description || '') : (hrefObj?.description || '');

    let imageSrc = '';
    if (useBlockData && block.preview_image) {
        imageSrc = getImageUrl(block.preview_image);
    } else if (!useBlockData && hrefObj?.hasPreviewImage && hrefObj?.['@id']) {
        imageSrc = hrefObj['@id'] + '/@@images/preview_image';
    }

    // Only add data-block-uid if blockUid is provided (not when inside a container that already has it)
    const blockUidAttr = blockUid ? `data-block-uid="${blockUid}"` : '';


    // If href is empty, show placeholder for starter UI (only for standalone teasers)
    if (!href && blockUid) {
        return `
            <div ${blockUidAttr} class="teaser-block teaser-placeholder" style="padding: 40px 20px; background: #f5f5f5; border: 2px dashed #ccc; border-radius: 8px; text-align: center; min-height: 150px; display: flex; align-items: center; justify-content: center;">
                <p style="color: #999; margin: 0;">Select a target page for this teaser</p>
            </div>
        `;
    }

    // Show teaser content when href has value
    const imageHtml = imageSrc
        ? `<img src="${imageSrc}" alt="" style="max-width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;" />`
        : '';

    // Always include editable/linkable attributes - hydra.js respects data-block-readonly
    return `
        <div ${blockUidAttr} class="teaser-block" style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
            ${imageHtml}
            <a href="${href || '#'}" data-linkable-field="href" style="display: block; margin: 0 0 10px 0; text-decoration: none; color: inherit;">
                <h3 data-editable-field="title" style="margin: 0;">${title}</h3>
            </a>
            <p data-editable-field="description" style="color: #666; margin: 0;">${description}</p>
            <a href="${href || '#'}" data-linkable-field="href" style="display: inline-block; margin-top: 10px; color: #007eb1; text-decoration: none;">Read more →</a>
        </div>
    `;
}

/**
 * Render a default result item (simple title + description).
 * @param {Object} block - Block data
 * @param {string} blockUid - Block UID
 * @returns {string} HTML string
 */
function renderDefaultItemBlock(block, blockUid) {
    const hrefObj = Array.isArray(block.href) && block.href.length > 0 ? block.href[0] : null;
    const href = hrefObj?.['@id'] || '';
    const title = block.title || hrefObj?.title || '';
    const description = block.description || hrefObj?.description || '';
    const blockUidAttr = blockUid ? `data-block-uid="${blockUid}"` : '';

    return `
        <div ${blockUidAttr} class="default-item-block" style="padding: 15px; border-bottom: 1px solid #eee;">
            <a href="${href || '#'}" data-linkable-field="href" style="text-decoration: none; color: inherit;">
                <h4 data-editable-field="title" style="margin: 0 0 5px 0;">${title}</h4>
            </a>
            <p data-editable-field="description" style="color: #666; margin: 0; font-size: 14px;">${description}</p>
        </div>
    `;
}

/**
 * Render a summary result item (title + description + image).
 * @param {Object} block - Block data
 * @param {string} blockUid - Block UID
 * @returns {string} HTML string
 */
function renderSummaryItemBlock(block, blockUid) {
    const hrefObj = Array.isArray(block.href) && block.href.length > 0 ? block.href[0] : null;
    const href = hrefObj?.['@id'] || '';
    const title = block.title || hrefObj?.title || '';
    const description = block.description || hrefObj?.description || '';
    const blockUidAttr = blockUid ? `data-block-uid="${blockUid}"` : '';

    const imageSrc = block.image ? getImageUrl(block.image) : '';

    const imageHtml = imageSrc
        ? `<img src="${imageSrc}" alt="" style="width: 80px; height: 60px; object-fit: cover; margin-right: 15px; border-radius: 4px;" />`
        : '';

    return `
        <div ${blockUidAttr} class="summary-item-block" style="padding: 15px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start;">
            ${imageHtml}
            <div style="flex: 1;">
                <a href="${href || '#'}" data-linkable-field="href" style="text-decoration: none; color: inherit;">
                    <h4 data-editable-field="title" style="margin: 0 0 5px 0;">${title}</h4>
                </a>
                <p data-editable-field="description" style="color: #666; margin: 0; font-size: 14px;">${description}</p>
            </div>
        </div>
    `;
}

/**
 * Render an image block.
 * @param {Object} block - Image block data
 * @returns {string} HTML string
 */
function renderImageBlock(block) {
    console.log('[TEST-FRONTEND] renderImageBlock:', { url: block.url, type: typeof block.url, hasImageScales: !!block.url?.image_scales });
    const imageSrc = getImageUrl(block.url);
    // Volto's image block uses 'placeholder' for alt text, not 'alt'
    const alt = block.placeholder || block.alt || '';
    const href = getLinkUrl(block.href);

    // Add data-media-field="url" for inline image editing
    const img = `<img data-media-field="url" src="${imageSrc}" alt="${alt}" />`;

    // If href is set, wrap in link with data-linkable-field on the <a>
    // This ensures hydra.js prevents navigation in edit mode
    if (href) {
        return `<a href="${href}" class="image-link" data-linkable-field="href">${img}</a>`;
    }
    // No href yet - put data-linkable-field on img so users can add a link
    return `<img data-media-field="url" data-linkable-field="href" src="${imageSrc}" alt="${alt}" />`;
}

/**
 * Render a video block.
 * @param {Object} block - Video block data with url
 * @returns {string} HTML string
 */
function renderVideoBlock(block) {
    const url = block.url || '';
    return `<div class="video-block">
        <p>Video: ${url || 'No URL set'}</p>
    </div>`;
}

/**
 * Render a columns container block.
 * Has TWO container fields: top_images and columns (tests multi-field routing)
 * Calls window._expandListingBlocks for nested listings in columns.
 * @param {Object} block - Columns block data with top_images/top_images_layout and columns/columns_layout
 * @returns {Promise<string>} HTML string
 */
async function renderColumnsBlock(block) {
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
        html += '<div class="top-images-row" style="display: flex; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">';
        html += '<div class="field-label" style="font-weight: bold; color: #666; font-size: 12px; writing-mode: vertical-rl; text-orientation: mixed;">TOP IMAGES</div>';

        for (const imgId of topImagesItems) {
            const img = topImages[imgId];
            if (!img) continue;

            // Render image as a nested block with data-block-uid and data-block-add="right"
            html += `<div data-block-uid="${imgId}" data-block-add="right" class="top-image" style="flex: 0 0 auto;">`;
            html += renderImageBlock(img);
            html += '</div>';
        }

        html += '</div>';
    }

    // Render columns container (columns go right)
    html += '<div class="columns-row" style="display: flex; gap: 20px;">';

    for (const columnId of columnsItems) {
        const column = columns[columnId];
        if (!column) continue;

        // Render column as a nested block with data-block-uid and data-block-add="right"
        html += `<div data-block-uid="${columnId}" data-block-add="right" class="column" style="flex: 1; padding: 10px; border: 1px dashed #ccc;">`;
        html += await renderColumnContent(column, columnId);
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/**
 * Render a column block content (the content blocks inside a column).
 * Content blocks go down (data-block-add="bottom").
 * Calls window._expandListingBlocks for nested listings.
 * @param {Object} column - Column block data with blocks/blocks_layout
 * @param {string} columnId - Column ID for expansion
 * @returns {Promise<string>} HTML string
 */
async function renderColumnContent(column, columnId) {
    let blocks = column.blocks || {};
    let items = column.blocks_layout?.items || [];
    const title = column.title || '';

    // Expand nested listings if expansion function is available
    // expandListingBlocks returns { items: [...], paging: {...} } where each item is a full block object
    let expandedItems = null;
    if (window._expandListingBlocks && items.length > 0) {
        const result = await window._expandListingBlocks(blocks, items, columnId);
        expandedItems = result.items;
    }

    let html = '';

    // Render editable title for column block
    if (title) {
        html += `<h4 data-editable-field="title" class="column-title" style="margin-bottom: 8px; font-size: 14px;">${title}</h4>`;
    }

    // Use expanded items if available, otherwise use original blocks/items
    const itemsToRender = expandedItems || items.map(id => ({ ...blocks[id], '@uid': id }));
    for (const item of itemsToRender) {
        const blockId = item['@uid'];
        const block = item;
        if (!block || !block['@type']) continue;

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
            case 'teaser':
                html += renderTeaserBlock(block, null);
                break;
            default:
                html += `<p>Unknown block type: ${block['@type']}</p>`;
        }

        html += '</div>';
    }

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
 * Calls window._expandListingBlocks for nested listings (set by index.html).
 * @param {Object} block - Grid block data with blocks/blocks_layout
 * @param {string} blockId - Block ID for paging URL
 * @returns {Promise<string>} HTML string
 */
async function renderGridBlock(block, blockId) {
    let blocks = block.blocks || {};
    let items = block.blocks_layout?.items || [];
    let paging = block._paging;

    // Expand nested listings if expansion function is available
    // expandListingBlocks returns { items, paging } where each item has @uid
    // paging includes computed UI values: currentPage, totalPages, pages, prev, next
    let expandedItems = null;
    if (window._expandListingBlocks) {
        const result = await window._expandListingBlocks(blocks, items, blockId);
        expandedItems = result.items;
        paging = result.paging?.totalPages > 1 ? result.paging : null;
    }

    let html = '<div class="grid-row" style="display: flex; flex-wrap: wrap; gap: 20px;">';

    // Use expanded items if available, otherwise fall back to original blocks
    const itemsToRender = expandedItems || items.map(id => ({ ...blocks[id], '@uid': id }));

    for (const childBlock of itemsToRender) {
        if (!childBlock) continue;

        // Use @uid from block for data-block-uid
        const uid = childBlock['@uid'];

        // All grid cells have data-block-uid so clicking anywhere in the cell selects the block
        html += `<div data-block-uid="${uid}" class="grid-cell" style="flex: 0 0 calc(25% - 15px); padding: 10px; border: 1px dashed #999;">`;

        // Render inner content based on block type
        // Note: Don't pass uid to render functions - grid-cell already has data-block-uid
        switch (childBlock['@type']) {
            case 'teaser':
                html += renderTeaserBlock(childBlock, null);
                break;
            case 'slate':
                html += renderSlateBlock(childBlock);
                break;
            case 'image':
                html += renderImageBlock(childBlock);
                break;
            case 'summaryItem':
                html += renderSummaryItemBlock(childBlock, null);
                break;
            case 'defaultItem':
                html += renderDefaultItemBlock(childBlock, null);
                break;
            case 'empty':
                html += renderEmptyBlock(childBlock);
                break;
            default:
                html += `<p>Unknown block type: ${childBlock['@type']}</p>`;
        }

        html += '</div>';
    }

    html += '</div>';

    // Render paging controls if available
    // data-linkable-allow tells hydra.js to allow navigation without beforeunload warning
    // Uses query params: ?pg_{blockId}={page} (preserves other params)
    if (paging) {
        const buildUrl = (page) => {
            const url = new URL(window.location.href);
            if (page > 0) {
                url.searchParams.set(`pg_${blockId}`, page);
            } else {
                url.searchParams.delete(`pg_${blockId}`);
            }
            return url.pathname + url.search;
        };

        html += '<nav class="grid-paging" style="margin-top: 15px; text-align: center;">';

        // Previous link
        if (paging.prev !== null) {
            html += `<a href="${buildUrl(paging.prev)}" data-linkable-allow class="paging-prev" style="margin: 0 5px; padding: 5px 10px; border: 1px solid #ccc; text-decoration: none;">← Prev</a>`;
        }

        // Page numbers (p.page is 1-indexed display, paging.currentPage is 0-indexed)
        // URL uses 0-indexed page number, not offset
        paging.pages.forEach(p => {
            const pageIndex = p.page - 1; // Convert to 0-indexed
            const isCurrent = pageIndex === paging.currentPage;
            const style = isCurrent
                ? 'margin: 0 3px; padding: 5px 10px; background: #007bff; color: white; border: 1px solid #007bff; text-decoration: none;'
                : 'margin: 0 3px; padding: 5px 10px; border: 1px solid #ccc; text-decoration: none;';
            html += `<a href="${buildUrl(pageIndex)}" data-linkable-allow class="paging-page${isCurrent ? ' current' : ''}" style="${style}">${p.page}</a>`;
        });

        // Next link
        if (paging.next !== null) {
            html += `<a href="${buildUrl(paging.next)}" data-linkable-allow class="paging-next" style="margin: 0 5px; padding: 5px 10px; border: 1px solid #ccc; text-decoration: none;">Next →</a>`;
        }

        html += '</nav>';
    }

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
 * Render an accordion block with separate header and content containers.
 * Calls window._expandListingBlocks for nested listings in content.
 *
 * @param {Object} block - Accordion block data with header/header_layout and content/content_layout
 * @param {string} blockId - Accordion block ID
 * @returns {Promise<string>} HTML string
 */
async function renderAccordionBlock(block, blockId) {
    let header = block.header || {};
    let headerItems = block.header_layout?.items || [];
    let content = block.content || {};
    let contentItems = block.content_layout?.items || [];

    // Expand nested listings in content (header usually doesn't have listings)
    // expandListingBlocks returns { items, paging } where each item has @uid
    let expandedItems = null;
    if (window._expandListingBlocks && contentItems.length > 0) {
        const result = await window._expandListingBlocks(content, contentItems, `${blockId}-content`);
        expandedItems = result.items;
    }

    let html = '<div class="accordion-container" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">';

    // Header section
    html += '<div class="accordion-header" style="background: #f5f5f5; padding: 15px; border-bottom: 1px solid #ddd;">';
    html += '<div class="header-label" style="font-weight: bold; margin-bottom: 8px; color: #666; font-size: 12px;">HEADER</div>';

    for (const childId of headerItems) {
        const childBlock = header[childId];
        if (childBlock) {
            html += `<div data-block-uid="${childId}" data-block-add="bottom">`;
            html += renderNestedSlateBlock(childBlock);
            html += '</div>';
        }
    }

    html += '</div>';

    // Content section
    html += '<div class="accordion-content" style="padding: 15px;">';
    html += '<div class="content-label" style="font-weight: bold; margin-bottom: 8px; color: #666; font-size: 12px;">CONTENT</div>';

    // Use expanded items if available, otherwise fall back to original blocks
    const itemsToRender = expandedItems || contentItems.map(id => ({ ...content[id], '@uid': id }));

    for (const childBlock of itemsToRender) {
        if (!childBlock) continue;
        const uid = childBlock['@uid'];
        html += `<div data-block-uid="${uid}" data-block-add="bottom">`;
        switch (childBlock['@type']) {
            case 'slate':
                html += renderNestedSlateBlock(childBlock);
                break;
            case 'image':
                html += renderImageBlock(childBlock);
                break;
            case 'teaser':
                html += renderTeaserBlock(childBlock, null);
                break;
            case 'summaryItem':
                html += renderSummaryItemBlock(childBlock, null);
                break;
            default:
                html += renderNestedSlateBlock(childBlock);
        }
        html += '</div>';
    }

    html += '</div>';

    html += '</div>';
    return html;
}

/**
 * Known facet field options for rendering widgets.
 * Maps field name to array of { value, title } options.
 * Matches the options from @querystring endpoint in mock API.
 */
const FACET_FIELD_OPTIONS = {
    'review_state': [
        { value: 'private', title: 'Private' },
        { value: 'pending', title: 'Pending' },
        { value: 'published', title: 'Published' },
    ],
    'portal_type': [
        { value: 'Document', title: 'Page' },
        { value: 'News Item', title: 'News Item' },
        { value: 'Event', title: 'Event' },
        { value: 'Image', title: 'Image' },
        { value: 'File', title: 'File' },
        { value: 'Link', title: 'Link' },
    ],
};

/**
 * Render the appropriate widget for a facet based on its type.
 * @param {Object} facet - Facet configuration
 * @returns {string} HTML string for the facet widget
 */
function renderFacetWidget(facet) {
    const facetType = facet.type || 'checkboxFacet';
    // Field can be an object { label, value } from Volto's select widget, or a plain string
    const field = typeof facet.field === 'object' ? facet.field?.value : facet.field || '';
    const options = FACET_FIELD_OPTIONS[field] || [];

    if (options.length === 0) {
        return '<div class="facet-widget" style="font-size: 11px; color: #999;">No options available</div>';
    }

    if (facetType === 'selectFacet') {
        // Render as dropdown select
        let optionsHtml = '<option value="">Select...</option>';
        optionsHtml += options.map(opt =>
            `<option value="${opt.value}">${opt.title}</option>`
        ).join('');
        return `<select class="facet-widget facet-select" data-field="${field}" style="width: 100%; padding: 4px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px;">
            ${optionsHtml}
        </select>`;
    } else if (facetType === 'checkboxFacet') {
        // Get current facet values from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentValues = urlParams.getAll(`facet.${field}`);

        // Render as checkboxes with checked state from URL
        const checkboxesHtml = options.map(opt => {
            const isChecked = currentValues.includes(opt.value) ? 'checked' : '';
            return `<label style="display: block; margin-top: 4px;">
                <input type="checkbox" class="facet-checkbox" data-field="${field}" value="${opt.value}" ${isChecked} />
                ${opt.title}
            </label>`;
        }).join('');
        return `<div class="facet-widget facet-checkboxes" style="margin-top: 4px;">
            ${checkboxesHtml}
        </div>`;
    }

    // Default: just show field name
    return '<div class="facet-widget" style="font-size: 11px; color: #999;">Widget not implemented</div>';
}

/**
 * Render a search block with facets and listing container.
 * The listing child is expanded via expandListingBlocks before rendering.
 *
 * @param {Object} block - Search block data with facets and listing/listing_layout
 * @param {string} blockId - Search block ID
 * @returns {Promise<string>} HTML string
 */
async function renderSearchBlock(block, blockId) {
    const headline = block.headline || '';
    const showSearchInput = block.showSearchInput;
    const showSortOn = block.showSortOn;
    const facets = block.facets || [];
    const sortOnOptions = block.sortOnOptions || [];
    const listing = block.listing || {};
    const listingLayout = block.listing_layout?.items || [];

    let html = '<div class="search-block" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">';

    // Headline
    if (headline) {
        html += `<h2 data-editable-field="headline" style="margin-bottom: 15px;">${headline}</h2>`;
    }

    // Search input
    if (showSearchInput) {
        // Get current search text from URL criteria (if available)
        const currentSearchText = window._searchCriteria?.SearchableText || '';
        html += `<div class="search-input" style="margin-bottom: 15px;">
            <form class="search-form" data-search-block="${blockId}" style="display: flex; gap: 10px;">
                <input type="text" name="SearchableText" placeholder="Search..." value="${currentSearchText}"
                    class="search-input-field"
                    style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
                <button type="submit" class="search-submit-button" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px;">
                    Search
                </button>
            </form>
        </div>`;
    }

    // Sort options
    if (showSortOn && sortOnOptions.length > 0) {
        html += `<div class="search-sort" style="margin-bottom: 15px;">
            <label style="margin-right: 8px;">Sort by:</label>
            <select style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${sortOnOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
        </div>`;
    }

    // Facets (rendered from object_list - each has data-block-uid for selection)
    if (facets.length > 0) {
        html += '<div class="search-facets" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">';
        html += '<div style="font-weight: bold; margin-bottom: 8px; color: #666; font-size: 12px;">FACETS</div>';
        for (const facet of facets) {
            const facetId = facet['@id'] || facet.id || '';
            html += `<div class="facet-item" data-block-uid="${facetId}" data-block-add="bottom" style="margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                <div data-editable-field="title" style="font-weight: bold;">${facet.title || ''}</div>
                <div style="font-size: 12px; color: #666;">Field: ${typeof facet.field === 'object' ? facet.field?.value : facet.field || ''}</div>
                ${renderFacetWidget(facet)}
            </div>`;
        }
        html += '</div>';
    }

    // Listing container - expand and render child blocks
    html += '<div class="search-results" style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">';

    // Expand listing blocks if we have the helper
    // expandListingBlocks returns { items, paging } where each item has @uid
    if (window._expandListingBlocks && listingLayout.length > 0) {
        const result = await window._expandListingBlocks(listing, listingLayout, `${blockId}-listing`);
        const expandedItems = result.items;

        for (const childBlock of expandedItems) {
            if (!childBlock) continue;

            // Use general block renderer - it handles all block types
            const uid = childBlock['@uid'];
            const blockElement = await renderBlock(uid, childBlock);
            if (blockElement) {
                // Add data-block-add attribute for direction
                if (blockElement instanceof DocumentFragment) {
                    // For fragments (like hero), find the actual block element
                    const actualElement = blockElement.querySelector('[data-block-uid]');
                    if (actualElement) actualElement.setAttribute('data-block-add', 'bottom');
                    html += Array.from(blockElement.childNodes).map(n => n.outerHTML || n.textContent).join('');
                } else {
                    blockElement.setAttribute('data-block-add', 'bottom');
                    html += blockElement.outerHTML;
                }
            }
        }
    } else {
        html += '<p style="color: #999;">No results</p>';
    }

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
 * Render a Skiplogic Test block.
 * @param {Object} block - Skiplogic test block data
 * @returns {string} HTML string
 */
function renderSkiplogicTestBlock(block) {
    const mode = block.mode || 'not set';
    const columns = block.columns || 1;
    const title = block.basicTitle || 'Untitled';
    return `
        <div class="skiplogic-test-block" style="padding: 16px; border: 1px solid #ccc; background: #f9f9f9;">
            <h4>Skiplogic Test Block</h4>
            <p>Mode: ${mode}</p>
            <p>Columns: ${columns}</p>
            <p>Title: ${title}</p>
        </div>
    `;
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

    // Sync data-block-readonly attribute from new block to existing element
    // This is needed because innerHTML only updates children, not the element's own attributes
    if (newBlock.hasAttribute('data-block-readonly')) {
        blockElement.setAttribute('data-block-readonly', '');
    } else {
        blockElement.removeAttribute('data-block-readonly');
    }
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
    console.log('[RENDERER] initCarouselNavigation called, content:', content ? 'found' : 'NOT FOUND');
    if (!content) return;

    content.addEventListener('click', function(event) {
        console.log('[RENDERER] Content click received, target:', event.target.tagName, event.target.className);
        const selectorElement = event.target.closest('[data-block-selector]');
        console.log('[RENDERER] selectorElement:', selectorElement ? selectorElement.getAttribute('data-block-selector') : 'null');
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

/**
 * Initialize search form submission handling.
 * Uses event delegation to handle all search forms.
 * Updates the URL with SearchableText param and reloads the page.
 */
function initSearchFormHandling() {
    document.addEventListener('submit', function(event) {
        const form = event.target.closest('.search-form');
        if (!form) return;

        event.preventDefault();

        const searchInput = form.querySelector('input[name="SearchableText"]');
        const searchText = searchInput?.value?.trim() || '';

        // Build new URL with search criteria
        const url = new URL(window.location.href);

        if (searchText) {
            url.searchParams.set('SearchableText', searchText);
        } else {
            url.searchParams.delete('SearchableText');
        }

        // Reload page with new search criteria
        console.log('[RENDERER] Search form submitted, navigating to:', url.toString());
        window.location.href = url.toString();
    });
}

/**
 * Initialize facet checkbox/select handling.
 * Uses event delegation to handle all facet widgets.
 * Updates the URL with facet.{field}={value} params and reloads the page.
 */
function initFacetHandling() {
    document.addEventListener('change', function(event) {
        const checkbox = event.target.closest('.facet-checkbox');
        const select = event.target.closest('.facet-select');

        if (!checkbox && !select) return;

        const url = new URL(window.location.href);

        if (checkbox) {
            const field = checkbox.dataset.field;
            const value = checkbox.value;
            const paramKey = `facet.${field}`;

            // Get current values for this facet (may be multiple)
            const currentValues = url.searchParams.getAll(paramKey);

            if (checkbox.checked) {
                // Add value if not already present
                if (!currentValues.includes(value)) {
                    url.searchParams.append(paramKey, value);
                }
            } else {
                // Remove this specific value
                url.searchParams.delete(paramKey);
                currentValues.filter(v => v !== value).forEach(v => {
                    url.searchParams.append(paramKey, v);
                });
            }
        } else if (select) {
            const field = select.dataset.field;
            const value = select.value;
            const paramKey = `facet.${field}`;

            if (value) {
                url.searchParams.set(paramKey, value);
            } else {
                url.searchParams.delete(paramKey);
            }
        }

        console.log('[RENDERER] Facet changed, navigating to:', url.toString());
        window.location.href = url.toString();
    });
}

// Initialize carousel navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initCarouselNavigation();
        initSearchFormHandling();
        initFacetHandling();
    });
} else {
    initCarouselNavigation();
    initSearchFormHandling();
    initFacetHandling();
}
