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

/**
 * Render content blocks to the DOM.
 * @param {Object} content - Content object with blocks and blocks_layout
 */
function renderContent(content) {
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
        // nodeId MUST be present - hydra.js is responsible for adding it
        if (node.nodeId === undefined) {
            throw new Error(`Missing nodeId on Slate node. hydra.js should add nodeIds before rendering. Node: ${JSON.stringify(node)}`);
        }

        const text = renderChildren(node.children);
        // Mark as editable field - hydra.js will read this and set contenteditable="true"

        // Render based on node type
        switch (node.type) {
            case 'p':
                html += `<p data-editable-field="value" data-node-id="${node.nodeId}">${text}</p>`;
                break;
            case 'h1':
                html += `<h1 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h1>`;
                break;
            case 'h2':
                html += `<h2 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h2>`;
                break;
            case 'h3':
                html += `<h3 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h3>`;
                break;
            case 'h4':
                html += `<h4 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h4>`;
                break;
            case 'h5':
                html += `<h5 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h5>`;
                break;
            case 'h6':
                html += `<h6 data-editable-field="value" data-node-id="${node.nodeId}">${text}</h6>`;
                break;
            case 'blockquote':
                html += `<blockquote data-editable-field="value" data-node-id="${node.nodeId}">${text}</blockquote>`;
                break;
            default:
                // Fallback for unknown block types
                html += `<p data-editable-field="value" data-node-id="${node.nodeId}">${text}</p>`;
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
            if (node.nodeId === undefined) {
                throw new Error(`Missing nodeId on Slate node in multifield description`);
            }
            const text = renderChildren(node.children);
            html += `<p data-editable-field="description" data-node-id="${node.nodeId}">${text}</p>`;
        }
    });

    return html;
}

/**
 * Render an image block.
 * @param {Object} block - Image block data
 * @returns {string} HTML string
 */
function renderImageBlock(block) {
    const url = block.url || '';
    const alt = block.alt || '';
    return `<img src="${url}" alt="${alt}" />`;
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
