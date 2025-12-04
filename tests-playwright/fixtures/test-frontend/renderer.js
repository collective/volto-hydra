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
    wrapper.setAttribute('data-block-type', block['@type']);

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
            default:
                // Fallback for unknown block types
                html += `<p data-editable-field="value"${nodeIdAttr}>${text}</p>`;
        }
    });

    return html || '<p data-editable-field="value">Empty block</p>';
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

    return `
        <div class="hero-block" style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
            <h1 data-editable-field="heading">${heading}</h1>
            <p data-editable-field="subheading" style="font-size: 1.2em; color: #666;">${subheadingHtml}</p>
            <div class="hero-description" style="margin: 10px 0;">${descriptionHtml}</div>
            <button data-editable-field="buttonText" style="padding: 10px 20px; cursor: pointer;">${buttonText}</button>
        </div>
    `;
}

/**
 * Render an image block.
 * @param {Object} block - Image block data
 * @returns {string} HTML string
 */
function renderImageBlock(block) {
    const url = block.url || '';
    const alt = block.alt || '';
    const href = block.href;

    const img = `<img src="${url}" alt="${alt}" />`;

    // If href is set, wrap in link - tests that click behavior is prevented in edit mode
    if (href) {
        return `<a href="${href}" class="image-link">${img}</a>`;
    }
    return img;
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
