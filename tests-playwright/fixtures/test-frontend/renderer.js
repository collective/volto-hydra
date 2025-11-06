/**
 * Block renderer for test frontend.
 * Renders blocks based on their @type.
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
        case 'image':
            wrapper.innerHTML = renderImageBlock(block);
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

    value.forEach(node => {
        if (node.type === 'p') {
            const text = node.children.map(child => {
                let content = child.text || '';
                // Handle formatting
                if (child.bold) content = `<strong>${content}</strong>`;
                if (child.italic) content = `<em>${content}</em>`;
                if (child.code) content = `<code>${content}</code>`;
                return content;
            }).join('');
            html += `<p contenteditable="true" data-slate-editor="true">${text}</p>`;
        }
    });

    return html || '<p contenteditable="true" data-slate-editor="true"></p>';
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
