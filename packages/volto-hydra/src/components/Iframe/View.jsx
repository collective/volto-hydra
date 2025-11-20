import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { compose } from 'redux';
import Cookies from 'js-cookie';
import {
  applyBlockDefaults,
  deleteBlock,
  getBlocksFieldname,
  getBlocksLayoutFieldname,
  insertBlock,
  moveBlock,
  mutateBlock,
  previousBlockId,
} from '@plone/volto/helpers';
import './styles.css';
import { useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { buttons as slateButtons } from '@plone/volto-slate/editor/config';
import isValidUrl from '../../utils/isValidUrl';
import { BlockChooser } from '@plone/volto/components';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import { useSelector, useDispatch } from 'react-redux';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import { setSidebarTab } from '@plone/volto/actions';
import {
  getAllowedBlocksList,
  setAllowedBlocksList,
} from '../../utils/allowedBlockList';
import toggleMark from '../../utils/toggleMark';
import slateTransforms from '../../utils/slateTransforms';
import { Editor, Transforms } from 'slate';
import { toggleInlineFormat, toggleBlock } from '@plone/volto-slate/utils/blocks';
import OpenObjectBrowser from './OpenObjectBrowser';
import HiddenSlateToolbar from '../../widgets/HiddenSlateToolbar';

/**
 * Extract button metadata from rendered Slate toolbar buttons via React fiber nodes
 * @param {React.RefObject} hiddenButtonsRef - Ref to the hidden container with rendered buttons
 * @param {Array} toolbarButtons - Array of button names from config
 * @returns {Object} - Object mapping button names to their metadata (format, title, svg)
 *
 * This function accesses React internals (fiber nodes) to extract component props.
 * This approach:
 * - Is truly dynamic and supports custom buttons added by plugins
 * - Works with React context (buttons are properly rendered)
 * - Extracts the actual format, title, and icon from component props
 */
/**
 * Extract field types for all block types from schema registry
 * @param {Object} intl - The react-intl intl object for internationalization
 * @returns {Object} - Object mapping blockType -> fieldName -> fieldType
 *
 * We look up schemas from config.blocks.blocksConfig for each registered block type
 * and identify which fields are Slate fields (widget: 'slate') vs text fields.
 * This way it works for all blocks of that type, including ones added later.
 */
const extractBlockFieldTypes = (intl) => {
  const blockFieldTypes = {};

  if (!config.blocks?.blocksConfig) {
    return blockFieldTypes;
  }

  // Hardcode known block types that don't have schemas
  // Slate blocks always have a 'value' field that is a slate field
  blockFieldTypes.slate = { value: 'slate' };
  blockFieldTypes.detachedSlate = { value: 'slate' };

  // Iterate through all registered block types
  Object.keys(config.blocks.blocksConfig).forEach((blockType) => {
    const blockConfig = config.blocks.blocksConfig[blockType];
    if (!blockConfig) {
      return;
    }

    try {
      // Get schema - can be a function or an object
      const schema = typeof blockConfig.blockSchema === 'function'
        ? blockConfig.blockSchema({ ...config, formData: {}, intl })
        : blockConfig.blockSchema;

      if (!schema?.properties) {
        console.log(`[VIEW] Skipping block type "${blockType}" - no schema.properties. Schema:`, schema);
        return;
      }

      // Map each field to its type for this block type
      blockFieldTypes[blockType] = {};
      Object.keys(schema.properties).forEach((fieldName) => {
        const field = schema.properties[fieldName];
        // Determine field type based on widget
        let fieldType = null;
        if (field.widget === 'slate') {
          fieldType = 'slate';
        } else if (field.widget === 'textarea') {
          fieldType = 'textarea';
        } else if (field.type === 'string') {
          fieldType = 'string';
        }

        if (fieldType) {
          console.log(`[VIEW] Extracted ${blockType}.${fieldName} = ${fieldType}`);
          blockFieldTypes[blockType][fieldName] = fieldType;
        }
      });
    } catch (error) {
      console.warn(`[VIEW] Error extracting field types for block type "${blockType}":`, error);
      // Continue with other block types
    }
  });

  return blockFieldTypes;
};

const extractButtonMetadata = (hiddenButtonsRef, toolbarButtons) => {
  const buttonConfigs = {};

  if (!hiddenButtonsRef.current) {
    console.warn('[VOLTO-HYDRA] Hidden buttons container not ready');
    return buttonConfigs;
  }

  // Find all toolbar elements (buttons and separators)
  // Note: SlateToolbar uses createPortal to render to document.body, not to our container
  // So we need to find the toolbar in document.body instead
  const toolbar = document.body.querySelector('.slate-inline-toolbar');
  if (!toolbar) {
    console.warn('[VIEW] Slate toolbar not found in document.body');
    return buttonConfigs;
  }

  const allElements = toolbar.querySelectorAll('.button-wrapper, .toolbar-separator');
  console.log('[VIEW] Found toolbar elements:', allElements.length);

  // Build a map from button elements to their React fiber props
  const fiberPropsMap = new Map();

  allElements.forEach((element, index) => {
    // Check if this is a separator
    if (element.classList.contains('toolbar-separator')) {
      fiberPropsMap.set(element, { buttonType: 'Separator' });
      console.log(`[VIEW] Found Separator at index ${index}`);
      return;
    }

    // Access React fiber node for buttons - React 16/17/18 use different keys
    const fiberKey = Object.keys(element).find(key =>
      key.startsWith('__reactFiber') ||
      key.startsWith('__reactInternalInstance')
    );

    if (fiberKey) {
      let fiber = element[fiberKey];
      let buttonProps = null;
      let formatProp = null;

      // Walk up the fiber tree to find button component
      // Look for any component with title and icon props (common to all toolbar buttons)
      while (fiber) {
        const props = fiber.memoizedProps || fiber.pendingProps;
        const componentName = fiber.type?.name;

        // Check if this fiber has button props (title and icon)
        if (props && props.title && props.icon && !buttonProps) {
          buttonProps = { buttonType: componentName || 'UnknownButton', ...props };
        }

        // Check if this fiber has the format prop (from BlockButton/MarkElementButton)
        if (props && props.format && !formatProp) {
          formatProp = props.format;
        }

        // If we found both button props and format, we're done
        if (buttonProps && formatProp) {
          buttonProps.format = formatProp;
          console.log(`[VIEW] Found button props for button ${index} (${buttonProps.buttonType}):`, {
            format: formatProp,
            title: buttonProps.title,
            icon: buttonProps.icon ? 'present' : 'missing'
          });
          fiberPropsMap.set(element, buttonProps);
          break;
        }

        fiber = fiber.return;
      }

      // If we found button props but no format, still save it (for link button, etc.)
      if (buttonProps && !formatProp) {
        console.log(`[VIEW] Found button props for button ${index} (${buttonProps.buttonType}):`, {
          format: buttonProps.format,
          title: buttonProps.title,
          icon: buttonProps.icon ? 'present' : 'missing'
        });
        fiberPropsMap.set(element, buttonProps);
      }
    }
  });

  // Match toolbar buttons config order with rendered elements
  let elementIndex = 0;
  toolbarButtons.forEach((buttonName) => {
    const element = allElements[elementIndex];
    const props = fiberPropsMap.get(element);

    if (buttonName === 'separator') {
      // Add separator to config
      buttonConfigs[buttonName] = {
        buttonType: 'Separator'
      };
      console.log(`[VIEW] Extracted separator at index ${elementIndex}`);
      elementIndex++;
      return;
    }

    if (props && (props.format || props.title)) {
      // Extract icon SVG from the button element
      const buttonElement = element.querySelector('button, a');
      const iconElement = buttonElement?.querySelector('.icon, [class*="icon"]');

      // The iconElement might BE the svg element (if svg has class="icon")
      // or it might be a container with an svg inside
      const svgElement = iconElement?.tagName === 'svg'
        ? iconElement
        : iconElement?.querySelector('svg');

      const svg = svgElement?.outerHTML || '';

      // Extract title - if it's a React element/object, get the text from the DOM element instead
      let title;
      if (typeof props.title === 'string') {
        title = props.title;
      } else if (props.title && typeof props.title === 'object') {
        // Title is a React element - extract text from the DOM button
        title = buttonElement?.getAttribute('title') || buttonElement?.getAttribute('aria-label') || buttonElement?.textContent?.trim() || buttonName;
      } else {
        title = buttonName;
      }

      buttonConfigs[buttonName] = {
        buttonType: props.buttonType, // 'MarkElementButton', 'BlockButton', or 'ClearFormattingButton'
        format: props.format || undefined,
        title: title,
        svg: svg,
        testId: `${buttonName}-button`
      };

      console.log(`[VIEW] Extracted metadata for ${buttonName}:`, buttonConfigs[buttonName]);
    } else {
      console.warn(`[VIEW] Could not extract props for button: ${buttonName}`);
    }

    elementIndex++;
  });

  return buttonConfigs;
};

/**
 * Returns url with query params + proper paths
 * @param {String} url
 * @param {Object} qParams
 * @param {String} pathname
 * @returns {String}
 */
const addUrlParams = (url, qParams, pathname) => {
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(qParams)) {
    urlObj.searchParams.set(key, value);
  }
  // console.log('pathname', appendPathToURL(newUrl, pathname));

  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (urlObj.hash) {
    urlObj.hash += `/${path}`;
  } else {
    urlObj.pathname += `${path}`;
  }
  const newURL = urlObj.toString();
  return newURL;
};

/**
 * Format the URL for the Iframe with location, token and edit mode
 * @param {URL} url
 * @param {String} token
 * @returns {URL} URL with the admin params
 */
const getUrlWithAdminParams = (url, token) => {
  return typeof window !== 'undefined'
    ? window.location.pathname.endsWith('/edit')
      ? addUrlParams(
          `${url}`,
          { access_token: token, _edit: true },
          `${window.location.pathname.replace('/edit', '')}`,
        )
      : addUrlParams(
          `${url}`,
          {
            access_token: token,
            _edit: false,
          },
          `${window.location.pathname}`,
        )
    : null;
};

const Iframe = (props) => {
  const {
    onSelectBlock,
    properties,
    onChangeFormData,
    metadata,
    formData: form, // Keep for compatibility, but we'll use Redux selector for sync
    token,
    allowedBlocks,
    showRestricted,
    blocksConfig = config.blocks.blocksConfig,
    navRoot,
    type: contentType,
    selectedBlock,
    openObjectBrowser,
    closeObjectBrowser,
  } = props;

  const dispatch = useDispatch();
  const [addNewBlockOpened, setAddNewBlockOpened] = useState(false);
  const [popperElement, setPopperElement] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [buttonMetadata, setButtonMetadata] = useState(null); // Store extracted button metadata
  const [blockUI, setBlockUI] = useState(null); // { blockUid, rect, showFormatButtons }
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false); // Track dropdown menu visibility
  const [menuButtonRect, setMenuButtonRect] = useState(null); // Store menu button position for portal positioning
  const [currentSelection, setCurrentSelection] = useState(null); // Store current selection from iframe
  const blockChooserRef = useRef();
  const hiddenButtonsRef = useRef(null); // Ref to hidden container for extracting button metadata
  const applyFormatRef = useRef(null); // Ref to shared format handler

  // Helper to check if a format is active at the given selection in the node tree
  const isFormatActiveAtSelection = (nodes, selection, format) => {
    if (!nodes || !selection) return false;

    // Helper to get node at path
    const getNodeAtPath = (root, path) => {
      let current = root;
      for (const index of path) {
        if (!current[index]) return null;
        current = current[index];
      }
      return current;
    };

    // Helper to check if any ancestor of the selection has the format type
    const checkPath = (path) => {
      // Walk up the path checking each node
      for (let i = 0; i < path.length; i++) {
        const partialPath = path.slice(0, i + 1);
        const node = getNodeAtPath(nodes, partialPath);
        if (node && node.type === format) {
          return true;
        }
      }
      return false;
    };

    // Check both anchor and focus paths
    if (selection.anchor && checkPath(selection.anchor.path)) {
      return true;
    }
    if (selection.focus && checkPath(selection.focus.path)) {
      return true;
    }

    return false;
  };

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    strategy: 'fixed',
    placement: 'bottom',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [550, -300],
        },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['right-end', 'top-start'],
        },
      },
    ],
  });

  // Extract button metadata from hidden toolbar after it mounts
  useEffect(() => {
    // Wait a tick for HiddenSlateToolbar to render on client-side
    const timer = setTimeout(() => {
      if (hiddenButtonsRef.current) {
        console.log('[VIEW] Hidden container HTML:', hiddenButtonsRef.current.innerHTML);
        console.log('[VIEW] Hidden container children:', hiddenButtonsRef.current.children);

        const toolbarButtons = config.settings.slate?.toolbarButtons || [];
        const metadata = extractButtonMetadata(hiddenButtonsRef, toolbarButtons);
        setButtonMetadata(metadata);
        console.log('[VIEW] Button metadata extracted:', metadata);
      } else {
        console.log('[VIEW] Hidden container ref is null');
      }
    }, 100); // Small delay to ensure client-side rendering completes

    return () => clearTimeout(timer);
  }, []); // Run once on mount

  useEffect(() => {
    // Only send SELECT_BLOCK if iframe is ready (has sent GET_INITIAL_DATA)
    // Skip if we're processing a format request - we don't want to interfere with selection restoration
    if (iframeOriginRef.current && selectedBlock && !processingFormatRequestRef.current) {
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        {
          type: 'SELECT_BLOCK',
          uid: selectedBlock,
          method: 'select',
          data: form,
        },
        iframeOriginRef.current,
      );
    }
  }, [selectedBlock, form]);

  const iframeOriginRef = useRef(null); // Store actual iframe origin from received messages
  const inlineEditCounterRef = useRef(0); // Count INLINE_EDIT_DATA messages from iframe
  const processedInlineEditCounterRef = useRef(0); // Count how many we've seen come back through Redux
  const processingFormatRequestRef = useRef(false); // True while processing SLATE_FORMAT_REQUEST
  const [iframeSrc, setIframeSrc] = useState(null);
  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get('iframe_url') ||
    urlFromEnv[0];

  // Subscribe to form data from Redux to detect changes
  // This provides a new reference on updates, unlike the mutated form prop
  const formDataFromRedux = useSelector((state) => state.form?.global);

  useEffect(() => {
    setIframeSrc(getUrlWithAdminParams(u, token));
    u && Cookies.set('iframe_url', u, { expires: 7 });
  }, [token, u]);
  const history = useHistory();

  const intl = useIntl();

  const onInsertBlock = (id, value, current) => {
    if (value?.['@type'] === 'slate') {
      value = {
        ...value,
        value: [{ type: 'p', children: [{ text: '', nodeId: 2 }], nodeId: 1 }],
      };
    }
    const [newId, newFormData] = insertBlock(
      properties,
      id,
      value,
      current,
      config.experimental.addBlockButton.enabled ? 1 : 0,
    );

    const blocksFieldname = getBlocksFieldname(newFormData);
    const blockData = newFormData[blocksFieldname][newId];
    newFormData[blocksFieldname][newId] = applyBlockDefaults({
      data: blockData,
      intl,
      metadata,
      properties,
    });

    onChangeFormData(newFormData);
    return newId;
  };

  const onMutateBlock = (id, value) => {
    const newFormData = mutateBlock(properties, id, value);
    onChangeFormData(newFormData);
  };

  useEffect(() => {
    const onDeleteBlock = (id, selectPrev) => {
      const previous = previousBlockId(properties, id);
      const newFormData = deleteBlock(properties, id);

      onChangeFormData(newFormData);
      onSelectBlock(selectPrev ? previous : null);
      setAddNewBlockOpened(false);
      dispatch(setSidebarTab(1));
    };

    // Shared format handler for both toolbar buttons and keyboard shortcuts
    const applyFormat = ({ blockId, format, selection, action = 'toggle', url, buttonType }) => {
      console.log('[VIEW] applyFormat called:', { blockId, format, selection, action, buttonType });

      // Make sure we're using the latest form data from closure
      const currentForm = form;

      const block = form.blocks[blockId];
      if (!block?.value) {
        console.error('[VIEW] No value found for block:', blockId);
        return false;
      }

      // Get the sidebar widget's Slate editor
      const fieldId = 'value';
      const sidebarEditor = typeof window !== 'undefined' && window.voltoHydraSidebarEditors?.get(fieldId);

      // Verify this editor is for the current block
      if (sidebarEditor && selectedBlock !== blockId) {
        console.log('[VIEW] Sidebar editor exists but selected block does not match:', selectedBlock, 'vs', blockId);
        return false;
      }

      if (!sidebarEditor) {
        console.warn('[VIEW] No sidebar editor available');
        return false;
      }

      try {
        // Set selection if provided
        if (selection) {
          Transforms.select(sidebarEditor, selection);
          console.log('[VIEW] Selection set on sidebar editor');
        }

        // Handle link format (element, not mark)
        if (format === 'link') {
          if (action === 'add' && url) {
            console.warn('[VIEW] Link wrapping not yet implemented');
          } else if (action === 'remove' || action === 'toggle') {
            console.warn('[VIEW] Link unwrapping not yet implemented');
          }
        } else if (buttonType === 'BlockButton') {
          // Apply block-level format (headings, lists, etc.)
          toggleBlock(sidebarEditor, format);
          console.log('[VIEW] Applied block format:', format);
        } else {
          // Apply inline format (bold, italic, etc.) - default for MarkElementButton
          toggleInlineFormat(sidebarEditor, format);
          console.log('[VIEW] Applied inline format:', format);
        }

        // Get updated value and selection
        const updatedValue = sidebarEditor.children;
        const transformedSelection = sidebarEditor.selection;

        // Build updated form
        const updatedForm = {
          ...form,
          blocks: {
            ...form.blocks,
            [blockId]: {
              ...block,
              value: updatedValue,
            },
          },
        };

        // Send to iframe with selection
        if (iframeOriginRef.current && referenceElement) {
          referenceElement.contentWindow.postMessage(
            {
              type: 'FORM_DATA',
              data: updatedForm,
              selection: transformedSelection,
            },
            iframeOriginRef.current
          );
          console.log('[VIEW] Sent updated form to iframe with selection');
        }

        // Update Redux form data
        onChangeFormData(updatedForm);
        return true;
      } catch (error) {
        console.error('[VIEW] Error applying format:', error);
        return false;
      }
    };

    // Store in ref so it's accessible outside useEffect
    applyFormatRef.current = applyFormat;

    const initialUrlOrigin = iframeSrc && new URL(iframeSrc).origin;
    const messageHandler = (event) => {
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      // Store the actual iframe origin from the first message we receive
      if (!iframeOriginRef.current) {
        iframeOriginRef.current = event.origin;
      }
      const { type } = event.data;
      switch (type) {
        case 'PATH_CHANGE': // PATH change from the iframe
          history.push(event.data.path);

          break;

        case 'OPEN_SETTINGS':
          if (history.location.pathname.endsWith('/edit')) {
            onSelectBlock(event.data.uid);
            setAddNewBlockOpened(false);
            dispatch(setSidebarTab(1));
          }
          break;

        case 'ADD_BLOCK':
          setAddNewBlockOpened(true);
          break;

        case 'DELETE_BLOCK':
          onDeleteBlock(event.data.uid, true);
          break;

        case 'ALLOWED_BLOCKS':
          if (
            JSON.stringify(getAllowedBlocksList()) !==
            JSON.stringify(event.data.allowedBlocks)
          ) {
            setAllowedBlocksList(event.data.allowedBlocks);
          }
          break;

        case 'INLINE_EDIT_DATA':
          inlineEditCounterRef.current += 1;
          console.log('[VIEW] INLINE_EDIT_DATA received, counter:', inlineEditCounterRef.current);

          onChangeFormData(event.data.data);
          break;

        case 'INLINE_EDIT_EXIT':
          
          break;

        case 'TOGGLE_MARK':
          // console.log('TOGGLE_BOLD', event.data.html);
          
          const deserializedHTMLData = toggleMark(event.data.html);
          // console.log('deserializedHTMLData', deserializedHTMLData);
          onChangeFormData({
            ...form,
            blocks: {
              ...form.blocks,
              [selectedBlock]: {
                ...form.blocks[selectedBlock],
                value: deserializedHTMLData,
              },
            },
          });
          event.source.postMessage(
            {
              type: 'TOGGLE_MARK_DONE',
              data: {
                ...form,
                blocks: {
                  ...form.blocks,
                  [selectedBlock]: {
                    ...form.blocks[selectedBlock],
                    value: deserializedHTMLData,
                  },
                },
              },
            },
            event.origin,
          );
          break;

        case 'SLATE_FORMAT_REQUEST':
          // Slate formatting handler - uses shared applyFormat function
          console.log('[VIEW] Received SLATE_FORMAT_REQUEST:', event.data);
          const success = applyFormat(event.data);
          if (!success) {
            event.source.postMessage(
              {
                type: 'SLATE_ERROR',
                blockId: event.data.blockId,
                error: 'Failed to apply format',
                originalRequest: event.data,
              },
              event.origin,
            );
          }
          break;

        case 'SLATE_UNDO_REQUEST':
          console.log('[VIEW] Received SLATE_UNDO_REQUEST, triggering global undo');
          // Dispatch a synthetic Ctrl+Z event to trigger Volto's global undo manager
          const undoEvent = new KeyboardEvent('keydown', {
            key: 'z',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(undoEvent);
          break;

        case 'SLATE_REDO_REQUEST':
          console.log('[VIEW] Received SLATE_REDO_REQUEST, triggering global redo');
          // Dispatch a synthetic Ctrl+Y event to trigger Volto's global undo manager
          const redoEvent = new KeyboardEvent('keydown', {
            key: 'y',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(redoEvent);
          break;

        case 'SLATE_PASTE_REQUEST':
          try {
            console.log('[VIEW] Received SLATE_PASTE_REQUEST:', event.data);
            const { blockId: pasteBlockId, html, selection: pasteSelection } = event.data;
            const block = form.blocks[pasteBlockId];

            if (!block) {
              console.error('[VIEW] Block not found:', pasteBlockId);
              event.source.postMessage(
                {
                  type: 'SLATE_ERROR',
                  blockId: pasteBlockId,
                  error: 'Block not found',
                  originalRequest: event.data,
                },
                event.origin,
              );
              break;
            }

            // Try to get the sidebar widget's Slate editor
            const fieldId = 'value';
            let sidebarEditor = typeof window !== 'undefined' &&
              window.voltoHydraSidebarEditors?.get(fieldId);

            // Verify this editor is for the current block
            if (sidebarEditor && selectedBlock !== pasteBlockId) {
              console.log('[VIEW] Sidebar editor exists but selected block does not match');
              sidebarEditor = null;
            }

            let updatedValue;
            let transformedSelection;

            if (sidebarEditor) {
              console.log('[VIEW] Using real sidebar editor for paste');

              // Set selection on editor
              Transforms.select(sidebarEditor, pasteSelection);

              // Deserialize pasted HTML to Slate fragment
              const pastedSlate = slateTransforms.htmlToSlate(html);
              console.log('[VIEW] Deserialized paste content:', JSON.stringify(pastedSlate));

              // For paste, we need to insert the text nodes, not block nodes
              // Extract text/inline nodes from the deserialized blocks
              let fragment = [];
              pastedSlate.forEach(node => {
                if (node.children) {
                  fragment.push(...node.children);
                } else {
                  fragment.push(node);
                }
              });

              console.log('[VIEW] Fragment to insert:', JSON.stringify(fragment));

              // Insert text using insertText for plain text or insertNodes for formatted
              if (fragment.length === 1 && fragment[0].text !== undefined && Object.keys(fragment[0]).length === 1) {
                // Plain text - use insertText
                Transforms.insertText(sidebarEditor, fragment[0].text);
              } else {
                // Formatted text - use insertNodes
                Transforms.insertNodes(sidebarEditor, fragment);
              }

              // Get updated value and selection from the editor
              updatedValue = sidebarEditor.children;
              transformedSelection = sidebarEditor.selection;

              console.log('[VIEW] Paste applied, new selection:', transformedSelection);
            } else {
              console.log('[VIEW] Sidebar editor not available, falling back to headless editor');

              // Fallback to headless editor
              const pastedSlate = slateTransforms.htmlToSlate(html);
              let fragment = [];
              pastedSlate.forEach(node => {
                if (node.children) {
                  fragment.push(...node.children);
                } else {
                  fragment.push(node);
                }
              });

              updatedValue = slateTransforms.insertNodes(block.value, pasteSelection, fragment);
              transformedSelection = pasteSelection; // Best guess
            }

            const updatedForm = {
              ...form,
              blocks: {
                ...form.blocks,
                [pasteBlockId]: {
                  ...block,
                  value: updatedValue,
                },
              },
            };

            onChangeFormData(updatedForm);

            event.source.postMessage(
              {
                type: 'FORM_DATA',
                data: updatedForm,
                transformedSelection,
              },
              event.origin,
            );
          } catch (error) {
            console.error('Error applying Slate paste:', error);
            event.source.postMessage(
              {
                type: 'SLATE_ERROR',
                blockId: event.data.blockId,
                error: error.message,
                originalRequest: event.data,
              },
              event.origin,
            );
          }
          break;

        case 'SLATE_DELETE_REQUEST':
          try {
            console.log('[VIEW] Received SLATE_DELETE_REQUEST:', event.data);
            const { blockId: delBlockId, direction, selection: delSelection } = event.data;
            const block = form.blocks[delBlockId];

            if (!block) {
              console.error('[VIEW] Block not found:', delBlockId);
              event.source.postMessage(
                {
                  type: 'SLATE_ERROR',
                  blockId: delBlockId,
                  error: 'Block not found',
                  originalRequest: event.data,
                },
                event.origin,
              );
              break;
            }

            // Try to get the sidebar widget's Slate editor
            const fieldId = 'value';
            let sidebarEditor = typeof window !== 'undefined' &&
              window.voltoHydraSidebarEditors?.get(fieldId);

            // Verify this editor is for the current block
            if (sidebarEditor && selectedBlock !== delBlockId) {
              console.log('[VIEW] Sidebar editor exists but selected block does not match');
              sidebarEditor = null;
            }

            let updatedValue;
            let transformedSelection;

            if (sidebarEditor) {
              console.log('[VIEW] Using real sidebar editor for deletion');

              // Apply deletion transform directly to the widget's editor
              Transforms.select(sidebarEditor, delSelection);

              if (direction === 'backward') {
                Transforms.delete(sidebarEditor, { unit: 'character', reverse: true });
              } else {
                Transforms.delete(sidebarEditor, { unit: 'character' });
              }

              // Get updated value and selection from the editor
              updatedValue = sidebarEditor.children;
              transformedSelection = sidebarEditor.selection;

              console.log('[VIEW] Deletion applied, new selection:', transformedSelection);
            } else {
              console.log('[VIEW] Sidebar editor not available, falling back to headless editor');

              // Fallback to headless editor
              const result = slateTransforms.applyDeletion(
                block.value,
                delSelection,
                direction,
              );
              updatedValue = result.value;
              transformedSelection = result.selection;
            }

            // Update form state
            const updatedForm = {
              ...form,
              blocks: {
                ...form.blocks,
                [delBlockId]: {
                  ...block,
                  value: updatedValue,
                },
              },
            };

            onChangeFormData(updatedForm);

            // Send FORM_DATA to iframe (hydra.js will add nodeIds and render HTML)
            event.source.postMessage(
              {
                type: 'FORM_DATA',
                data: updatedForm,
                transformedSelection,
              },
              event.origin,
            );
          } catch (error) {
            console.error('Error applying Slate deletion:', error);
            event.source.postMessage(
              {
                type: 'SLATE_ERROR',
                blockId: event.data.blockId,
                error: error.message,
                originalRequest: event.data,
              },
              event.origin,
            );
          }
          break;

        case 'SLATE_ENTER_REQUEST':
          console.log('[VIEW] ========== SLATE_ENTER_REQUEST RECEIVED ==========');
          try {
            const { blockId: enterBlockId, selection } = event.data;
            console.log('[VIEW] Block ID:', enterBlockId);
            console.log('[VIEW] Selection:', selection);

            // Get the current block data
            const currentBlock = form.blocks[enterBlockId];
            if (!currentBlock || currentBlock['@type'] !== 'slate') {
              console.error('[VIEW] Block not found or not a slate block');
              break;
            }

            console.log('[VIEW] Current block data:', currentBlock);

            // Split the block at the cursor using slateTransforms
            const { topValue, bottomValue } = slateTransforms.splitBlock(
              currentBlock.value,
              selection,
            );

            console.log('[VIEW] Split content:', { topValue, bottomValue });

            // Create new form data with updated blocks
            const newFormData = { ...form };
            const blocksFieldname = getBlocksFieldname(newFormData);

            // Update current block with content before cursor
            newFormData[blocksFieldname][enterBlockId] = {
              ...currentBlock,
              value: topValue,
            };

            // Create new block with content after cursor
            const [newBlockId, updatedFormData] = insertBlock(
              newFormData,
              enterBlockId,
              {
                '@type': 'slate',
                value: bottomValue,
              },
              {},
              1,
              config.blocks.blocksConfig,
            );

            console.log('[VIEW] Created new block:', newBlockId);

            // Set isInlineEditing to false BEFORE updating Redux
            // This allows the useEffect to send SELECT_BLOCK when we call onSelectBlock
            

            // Update Redux state with the formData returned by insertBlock
            onChangeFormData(updatedFormData);
            onSelectBlock(newBlockId);

            // Send FORM_DATA message to trigger iframe re-render with new block
            if (iframeOriginRef.current) {
              event.source.postMessage(
                { type: 'FORM_DATA', data: updatedFormData },
                event.origin,
              );
            }
          } catch (error) {
            console.error('[VIEW] Error handling SLATE_ENTER_REQUEST:', error);
            event.source.postMessage(
              {
                type: 'SLATE_ERROR',
                blockId: event.data.blockId,
                error: error.message,
              },
              event.origin,
            );
          }
          break;

        case 'UPDATE_BLOCKS_LAYOUT':

          onChangeFormData(event.data.data);
          break;

        case 'SELECTION_CHANGE':
          // Store current selection from iframe for format operations
          setCurrentSelection(event.data.selection);
          break;

        case 'BLOCK_SELECTED':
          // Update block UI state to render overlays (selection outline, toolbar, add button)
          setBlockUI({
            blockUid: event.data.blockUid,
            rect: event.data.rect,
            showFormatButtons: event.data.showFormatButtons,
          });
          break;

        case 'HIDE_BLOCK_UI':
          // Hide all block UI overlays
          setBlockUI(null);
          break;

        case 'GET_INITIAL_DATA':
          // Store the iframe's actual origin when it first contacts us
          iframeOriginRef.current = event.origin;

          // Use button metadata from state (extracted in useEffect after hidden widget mounts)
          const toolbarButtons = config.settings.slate?.toolbarButtons || [];

          // Extract block field types from schema registry (maps blockType -> fieldName -> fieldType)
          const blockFieldTypes = extractBlockFieldTypes(intl);
          console.log('[VIEW] Final blockFieldTypes:', JSON.stringify(blockFieldTypes));

          // If metadata not ready yet, wait and retry
          if (!buttonMetadata) {
            console.log('[VIEW] Button metadata not ready, waiting...');
            setTimeout(() => {
              event.source.postMessage(
                {
                  type: 'INITIAL_DATA',
                  data: form,
                  blockFieldTypes,
                  slateConfig: {
                    hotkeys: config.settings.slate?.hotkeys || {},
                    toolbarButtons,
                    buttonConfigs: buttonMetadata || {}, // Use metadata from state
                  },
                },
                event.origin,
              );
            }, 150); // Wait for metadata extraction to complete
            return;
          }

          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: form,
              blockFieldTypes,
              slateConfig: {
                hotkeys: config.settings.slate?.hotkeys || {},
                toolbarButtons,
                buttonConfigs: buttonMetadata, // Use metadata from state
              },
            },
            event.origin,
          );
          // Don't send SELECT_BLOCK here - let the useEffect handle it after content is rendered
          // The useEffect at line ~375 will send SELECT_BLOCK once iframe is ready and content is rendered
          break;

        // case 'OPEN_OBJECT_BROWSER':
        //   openObjectBrowser({
        //     mode: event.data.mode,
        //     propDataName: 'data',
        //     onSelectItem: (item) => {
        //       event.source.postMessage(
        //         {
        //           type: 'OBJECT_SELECTED',
        //           path: item,
        //         },
        //         event.origin,
        //       );
        //       closeObjectBrowser();
        //       
        //     },
        //   });
        //   break;

        default:
          break;
      }
    };

    // Listen for messages from the iframe
    window.addEventListener('message', messageHandler);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [
    closeObjectBrowser,
    dispatch,
    form,
    form?.blocks,
    history,
    history.location.pathname,
    iframeSrc,
    onChangeFormData,
    onSelectBlock,
    openObjectBrowser,
    properties,
    selectedBlock,
    token,
  ]);

  useEffect(() => {
    // Use formDataFromRedux if available (for change detection), otherwise fall back to form prop
    const formToUse = formDataFromRedux || form;

    // Check if this formData change is from an INLINE_EDIT_DATA we haven't processed yet
    const hasUnprocessedInlineEdit = processedInlineEditCounterRef.current < inlineEditCounterRef.current;

    console.log('[VIEW] FORM_DATA useEffect triggered:', {
      iframeReady: !!iframeOriginRef.current,
      hasForm: !!formToUse,
      selectedBlock,
      blockData: formToUse?.blocks?.[selectedBlock],
      inlineEditCounter: inlineEditCounterRef.current,
      processedCounter: processedInlineEditCounterRef.current,
      hasUnprocessedInlineEdit,
    });

    if (hasUnprocessedInlineEdit) {
      // This is the formData update FROM the iframe's inline edit, don't send it back
      processedInlineEditCounterRef.current += 1;
      console.log('[VIEW] Skipping FORM_DATA send - this is from iframe inline edit, processed:', processedInlineEditCounterRef.current);
    } else if (processingFormatRequestRef.current) {
      // Skip sends while processing a format request - we're sending directly from the handler
      console.log('[VIEW] Skipping FORM_DATA send - processing format request');
    } else if (iframeOriginRef.current && formToUse && Object.keys(formToUse).length > 0) {
      // Check if the sidebar has focus (user is editing there)
      const sidebarElement = document.querySelector('.sidebar-container, [class*="sidebar"]');
      const sidebarHasFocus = sidebarElement?.contains(document.activeElement);

      if (sidebarHasFocus) {
        // Sidebar has focus - user is editing there, send updates to iframe
        console.log('[VIEW] Sending FORM_DATA to iframe - sidebar has focus');
        document
          .getElementById('previewIframe')
          ?.contentWindow?.postMessage(
            { type: 'FORM_DATA', data: formToUse },
            iframeOriginRef.current,
          );
      } else {
        // Sidebar doesn't have focus - user is editing in iframe, don't send
        console.log('[VIEW] Skipping FORM_DATA send - sidebar does not have focus');
      }
    }
  }, [formDataFromRedux, form, selectedBlock]);

  const sidebarFocusEventListenerRef = useRef(null);

  useEffect(() => {
    const handleMouseHover = (e) => {
      e.stopPropagation();
      
      // console.log(
      //   'Sidebar or its child element focused!',
      // );
    };
    sidebarFocusEventListenerRef.current = handleMouseHover;
    const sidebarElement = document.getElementById('sidebar');
    sidebarElement.addEventListener('mouseover', handleMouseHover, true);

    // Cleanup on component unmount
    return () => {
      // ... (your other cleanup code)
      if (sidebarElement && sidebarFocusEventListenerRef.current) {
        sidebarElement.removeEventListener(
          'mouseover',
          sidebarFocusEventListenerRef.current,
          true,
        );
      }
    };
  }, []);

  // Handle window resize to update block UI overlay positions
  useEffect(() => {
    const handleResize = () => {
      // On window resize, request updated positions from iframe
      if (blockUI && iframeOriginRef.current) {
        const iframe = document.getElementById('previewIframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'REQUEST_BLOCK_RESELECT',
              blockUid: blockUI.blockUid,
            },
            iframeOriginRef.current,
          );
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [blockUI]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (menuDropdownOpen) {
      const handleClickOutside = (event) => {
        // Close dropdown if clicking anywhere outside
        if (!event.target.closest('.volto-hydra-dropdown-menu')) {
          setMenuDropdownOpen(false);
        }
      };

      // Add slight delay to avoid immediate close from the button click that opened it
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuDropdownOpen]);

  return (
    <div id="iframeContainer">
      {/* Hidden Slate widget to extract toolbar button metadata */}
      <HiddenSlateToolbar containerRef={hiddenButtonsRef} />
      <OpenObjectBrowser
        origin={iframeSrc && new URL(iframeSrc).origin}
      />
      {addNewBlockOpened &&
        createPortal(
          <div
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
          >
            <BlockChooser
              onMutateBlock={
                onMutateBlock
                  ? (id, value) => {
                      setAddNewBlockOpened(false);
                      onMutateBlock(id, value);
                    }
                  : null
              }
              onInsertBlock={
                onInsertBlock
                  ? (id, value) => {
                      setAddNewBlockOpened(false);

                      const newId = onInsertBlock(id, value);
                      onSelectBlock(newId);
                      setAddNewBlockOpened(false);
                      dispatch(setSidebarTab(1));
                    }
                  : null
              }
              currentBlock={selectedBlock}
              allowedBlocks={allowedBlocks}
              blocksConfig={blocksConfig}
              properties={properties}
              showRestricted={showRestricted}
              ref={blockChooserRef}
              navRoot={navRoot}
              contentType={contentType}
            />
          </div>,
          document.body,
        )}
      <iframe
        id="previewIframe"
        title="Preview"
        src={iframeSrc}
        ref={setReferenceElement}
        allow="clipboard-read; clipboard-write"
      />

      {/* Block UI Overlays - rendered in parent window, positioned over iframe */}
      {blockUI && referenceElement && (
        <>
          {/* Selection Outline - blue border or bottom line depending on block type */}
          <div
            className="volto-hydra-block-outline"
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left}px`,
              top: blockUI.showFormatButtons
                ? `${referenceElement.getBoundingClientRect().top + blockUI.rect.top + blockUI.rect.height - 1}px`
                : `${referenceElement.getBoundingClientRect().top + blockUI.rect.top - 2}px`,
              width: `${blockUI.rect.width}px`,
              height: blockUI.showFormatButtons ? '3px' : `${blockUI.rect.height + 4}px`,
              background: blockUI.showFormatButtons ? '#007eb1' : 'transparent',
              border: blockUI.showFormatButtons ? 'none' : '2px solid #007eb1',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Quanta Toolbar - floating toolbar */}
          <div
            className="volto-hydra-quantaToolbar"
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left}px`,
              top: `${referenceElement.getBoundingClientRect().top + blockUI.rect.top - 48}px`,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '0',
              background: '#fff',
              border: '1px solid #c7d5d8',
              borderRadius: '3px',
              padding: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              pointerEvents: 'none', // Let events pass through to iframe
            }}
          >
            {/* Drag handle - visual only, events pass through to iframe */}
            <button
              style={{
                background: '#fff',
                border: 'none',
                borderRight: '1px solid #e0e0e0',
                padding: '8px 10px',
                cursor: 'grab',
                fontSize: '16px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                marginRight: '4px',
                pointerEvents: 'none',
              }}
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
            {blockUI.showFormatButtons && buttonMetadata && (
              <>
                {/* Format buttons - rendered from extracted metadata */}
                {Object.entries(buttonMetadata).map(([buttonName, config]) => {
                  if (config.buttonType === 'Separator') {
                    return (
                      <div
                        key={buttonName}
                        style={{ width: '1px', height: '28px', background: '#e0e0e0', margin: '0 4px' }}
                      />
                    );
                  }

                  // Check if this format is active at the current selection
                  const block = selectedBlock && form.blocks[selectedBlock];
                  const isActive = config.format && block?.value && currentSelection
                    ? isFormatActiveAtSelection(block.value, currentSelection, config.format)
                    : false;

                  return (
                    <button
                      key={buttonName}
                      style={{
                        background: isActive ? '#e0e0e0' : '#fff',
                        border: 'none',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        color: isActive ? '#007bff' : '#333',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={config.title}
                      onClick={() => {
                        // Apply format using shared applyFormat function via ref
                        console.log('[VIEW] Format button clicked:', config.format, config.buttonType);
                        if (config.format && selectedBlock && applyFormatRef.current) {
                          applyFormatRef.current({
                            blockId: selectedBlock,
                            format: config.format,
                            selection: currentSelection,
                            action: 'toggle',
                            buttonType: config.buttonType,
                          });
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: config.svg }}
                    />
                  );
                })}
              </>
            )}
            <button
              style={{
                background: '#fff',
                border: 'none',
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#666',
                pointerEvents: 'auto',
                position: 'relative',
              }}
              title="More options"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuButtonRect(rect);
                setMenuDropdownOpen(!menuDropdownOpen);
              }}
            >
              ⋯
            </button>
          </div>

          {/* Add Button - below block, right-aligned */}
          <button
            className="volto-hydra-add-button"
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left + blockUI.rect.width - 30}px`,
              top: `${referenceElement.getBoundingClientRect().top + blockUI.rect.top + blockUI.rect.height + 8}px`,
              zIndex: 10,
              width: '30px',
              height: '30px',
              background: 'transparent',
              color: '#b8b8b8',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              lineHeight: '1',
              fontWeight: '300',
              padding: 0,
            }}
            onClick={() => setAddNewBlockOpened(true)}
            title="Add block"
          >
            +
          </button>
        </>
      )}

      {/* Dropdown menu - rendered as portal to avoid container clipping */}
      {menuDropdownOpen && menuButtonRect && createPortal(
        <div
          className="volto-hydra-dropdown-menu"
          style={{
            position: 'fixed',
            left: `${menuButtonRect.right - 180}px`, // Align right edge with button
            top: `${menuButtonRect.bottom + 4}px`,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            width: '180px',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="volto-hydra-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
            onClick={() => {
              setMenuDropdownOpen(false);
              // TODO: Open settings sidebar
            }}
          >
            ⚙️ Settings
          </div>
          <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.1)', margin: '0 10px' }} />
          <div
            className="volto-hydra-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
            onClick={() => {
              setMenuDropdownOpen(false);
              if (selectedBlock) {
                const previous = previousBlockId(properties, selectedBlock);
                const newFormData = deleteBlock(properties, selectedBlock);
                onChangeFormData(newFormData);
                onSelectBlock(previous);
                dispatch(setSidebarTab(1));
              }
            }}
          >
            🗑️ Remove
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Iframe;
