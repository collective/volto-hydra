import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { compose } from 'redux';
import Cookies from 'js-cookie';
import {
  applyBlockDefaults,
  deleteBlock,
  getBlocksFieldname,
  insertBlock,
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
import { toggleInlineFormat } from '@plone/volto-slate/utils/blocks';
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
 * @returns {Object} - Object mapping blockType -> fieldName -> fieldType
 *
 * We look up schemas from config.blocks.blocksConfig for each registered block type
 * and identify which fields are Slate fields (widget: 'slate') vs text fields.
 * This way it works for all blocks of that type, including ones added later.
 */
const extractBlockFieldTypes = () => {
  const blockFieldTypes = {};

  if (!config.blocks?.blocksConfig) {
    return blockFieldTypes;
  }

  // Iterate through all registered block types
  Object.keys(config.blocks.blocksConfig).forEach((blockType) => {
    const blockConfig = config.blocks.blocksConfig[blockType];
    if (!blockConfig) {
      return;
    }

    // Get schema - can be a function or an object
    const schema = typeof blockConfig.blockSchema === 'function'
      ? blockConfig.blockSchema({ ...config, formData: {}, intl: {} })
      : blockConfig.blockSchema;

    if (!schema?.properties) {
      return;
    }

    // Map each field to its type for this block type
    blockFieldTypes[blockType] = {};
    Object.keys(schema.properties).forEach((fieldName) => {
      const field = schema.properties[fieldName];
      // Determine field type based on widget
      if (field.widget === 'slate') {
        blockFieldTypes[blockType][fieldName] = 'slate';
      } else if (field.widget === 'textarea') {
        blockFieldTypes[blockType][fieldName] = 'textarea';
      } else if (field.type === 'string') {
        blockFieldTypes[blockType][fieldName] = 'string';
      }
    });
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
  const blockChooserRef = useRef();
  const hiddenButtonsRef = useRef(null); // Ref to hidden container for extracting button metadata
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
          // Slate formatting handler - prefers using sidebar widget's editor directly
          try {
            // Set flag to prevent useEffect from sending duplicate FORM_DATA
            processingFormatRequestRef.current = true;
            console.log('[VIEW] Received SLATE_FORMAT_REQUEST:', event.data);
            const { blockId, format, action, selection, url } = event.data;
            console.log('[VIEW] Looking for block:', blockId);
            const block = form.blocks[blockId];
            console.log('[VIEW] Block found:', !!block, 'Block value:', block?.value);

            if (!block?.value) {
              console.error('[VIEW] No value found for block:', blockId);
              event.source.postMessage(
                {
                  type: 'SLATE_ERROR',
                  blockId,
                  error: 'Block not found or no value available',
                  originalRequest: event.data,
                },
                event.origin,
              );
              break;
            }

            // Try to get the sidebar widget's Slate editor
            // The widget registers with the field ID which is "value" for the slate block
            // We need to check if the currently selected block matches this editor
            const fieldId = 'value';
            let sidebarEditor = typeof window !== 'undefined' && window.voltoHydraSidebarEditors?.get(fieldId);

            // Verify this editor is for the current block by checking if it's mounted
            // and the selected block in the form matches our blockId
            if (sidebarEditor && selectedBlock !== blockId) {
              console.log('[VIEW] Sidebar editor exists but selected block does not match:', selectedBlock, 'vs', blockId);
              sidebarEditor = null; // Don't use editor if it's for a different block
            }

            if (!sidebarEditor && typeof window !== 'undefined' && __CLIENT__) {
              // Debug: log all registered editor IDs
              console.log('[VIEW] Available sidebar editor IDs:', Array.from(window.voltoHydraSidebarEditors?.keys() || []));
            }

            if (sidebarEditor) {
              console.log('[VIEW] Using sidebar widget editor for field:', fieldId);

              // Apply transform directly to the widget's editor
              try {
                // Set selection
                Transforms.select(sidebarEditor, selection);
                console.log('[VIEW] Selection set on sidebar editor');

                // Handle link format (element, not mark)
                if (format === 'link') {
                  if (action === 'add' && url) {
                    // TODO: Implement wrapLink for sidebar editor
                    console.warn('[VIEW] Link wrapping not yet implemented for sidebar editor');
                  } else if (action === 'remove' || action === 'toggle') {
                    // TODO: Implement unwrapLink for sidebar editor
                    console.warn('[VIEW] Link unwrapping not yet implemented for sidebar editor');
                  }
                } else {
                  // Handle inline formats using toggleInlineFormat
                  // Format name already mapped in hydra.js based on button config
                  console.log('[VIEW] Applying inline format:', format);

                  // toggleInlineFormat handles all actions (toggle, add, remove)
                  // It creates inline element nodes like { type: 'strong', children: [...] }
                  // This enables sticky formatting at cursor positions
                  toggleInlineFormat(sidebarEditor, format);
                  console.log('[VIEW] Applied toggleInlineFormat for:', format);
                }

                // Get the updated value and selection from the editor after applying the transform
                const updatedValue = sidebarEditor.children;
                const transformedSelection = sidebarEditor.selection;
                console.log('[VIEW] Widget editor updated, selection:', transformedSelection);

                // Build the updated form with the new block value
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

                // Send FORM_DATA immediately to the iframe with the selection
                // IMPORTANT: Do NOT call onChangeFormData() here - that would trigger the useEffect
                // and cause a double-send that might not include the selection
                const message = {
                  type: 'FORM_DATA',
                  data: updatedForm,
                  selection: transformedSelection,
                };
                console.log('[VIEW] Sending FORM_DATA with selection directly to iframe');
                event.source.postMessage(message, event.origin);

                // The sidebar widget's onChange will fire naturally (Slate triggers it automatically)
                // and will update the Redux form state, which would normally trigger the useEffect
                // However, we set processingFormatRequestRef which prevents the useEffect from sending

                // Clear the flag after a short delay to allow the editor's onChange to complete
                setTimeout(() => {
                  processingFormatRequestRef.current = false;
                  console.log('[VIEW] Cleared processingFormatRequest flag');
                }, 100);
              } catch (error) {
                console.error('[VIEW] Error applying format to sidebar editor:', error);
                processingFormatRequestRef.current = false; // Clear flag on error
                throw error; // Will be caught by outer catch
              }
            } else {
              // No sidebar editor found - this is an error condition
              const errorMsg = `No sidebar editor found for field: ${fieldId}. Make sure the HydraSlateWidget is properly registered.`;
              console.error('[VIEW]', errorMsg);
              throw new Error(errorMsg);
            }
          } catch (error) {
            console.error('Error applying Slate format:', error);
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

        case 'GET_INITIAL_DATA':
          // Store the iframe's actual origin when it first contacts us
          iframeOriginRef.current = event.origin;

          // Use button metadata from state (extracted in useEffect after hidden widget mounts)
          const toolbarButtons = config.settings.slate?.toolbarButtons || [];

          // Extract block field types from schema registry (maps blockType -> fieldName -> fieldType)
          const blockFieldTypes = extractBlockFieldTypes();

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
          // If there's a selected block, send SELECT_BLOCK now that iframe is ready
          if (selectedBlock) {
            event.source.postMessage(
              {
                type: 'SELECT_BLOCK',
                uid: selectedBlock,
                method: 'select',
                data: form,
              },
              event.origin,
            );
          }
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
    </div>
  );
};

export default Iframe;
