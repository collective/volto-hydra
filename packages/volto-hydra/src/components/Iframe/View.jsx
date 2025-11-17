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
import OpenObjectBrowser from './OpenObjectBrowser';

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
  const blockChooserRef = useRef();
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
  useEffect(() => {
    // Only send SELECT_BLOCK if iframe is ready (has sent GET_INITIAL_DATA)
    if (!isInlineEditingRef.current && iframeOriginRef.current && selectedBlock) {
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

  const isInlineEditingRef = useRef(false);
  const iframeOriginRef = useRef(null); // Store actual iframe origin from received messages
  const [iframeSrc, setIframeSrc] = useState(null);
  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get('iframe_url') ||
    urlFromEnv[0];

  // Subscribe to form data from Redux to detect changes
  // This provides a new reference on updates, unlike the mutated form prop
  const formDataFromRedux = useSelector((state) => {
    console.log('[VIEW] useSelector evaluating, state.form.global:', state.form?.global);
    return state.form?.global;
  });

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
      isInlineEditingRef.current = false;
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
          isInlineEditingRef.current = true;
          // console.log('INLINE_EDIT_DATA is triggered, true', event.data?.from);

          onChangeFormData(event.data.data);
          break;

        case 'INLINE_EDIT_EXIT':
          isInlineEditingRef.current = false;
          break;

        case 'TOGGLE_MARK':
          // console.log('TOGGLE_BOLD', event.data.html);
          isInlineEditingRef.current = true;
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
                  // Handle mark formats (bold, italic, del)
                  if (action === 'toggle') {
                    const marks = Editor.marks(sidebarEditor);
                    const isActive = marks?.[format] === true;
                    console.log('[VIEW] Current format active?', isActive);

                    if (isActive) {
                      Editor.removeMark(sidebarEditor, format);
                      console.log('[VIEW] Removed mark:', format);
                    } else {
                      Editor.addMark(sidebarEditor, format, true);
                      console.log('[VIEW] Added mark:', format);
                    }
                  } else if (action === 'add') {
                    Editor.addMark(sidebarEditor, format, true);
                    console.log('[VIEW] Added mark (action=add):', format);
                  } else if (action === 'remove') {
                    Editor.removeMark(sidebarEditor, format);
                    console.log('[VIEW] Removed mark (action=remove):', format);
                  }
                }

                // Get the updated value and selection from the editor
                const updatedValue = sidebarEditor.children;
                const transformedSelection = sidebarEditor.selection;
                console.log('[VIEW] Widget editor updated, selection:', transformedSelection);

                // Update form state with the new value from the widget
                // The widget's onChange would normally fire, but we're modifying the editor directly
                // so we need to update the form ourselves
                isInlineEditingRef.current = true;
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

                onChangeFormData(updatedForm);

                // Send FORM_DATA to the iframe with the new data and selection
                const message = {
                  type: 'FORM_DATA',
                  data: updatedForm,
                  selection: transformedSelection,
                };
                console.log('[VIEW] Sending FORM_DATA with updated data and selection to iframe');
                event.source.postMessage(message, event.origin);
              } catch (error) {
                console.error('[VIEW] Error applying format to sidebar editor:', error);
                // Fallback to headless approach
                console.log('[VIEW] Falling back to headless editor');
                throw error; // Will be caught by outer catch and use fallback
              }
            } else {
              // Fallback to headless editor approach
              console.log('[VIEW] No sidebar editor found for field:', fieldId, '- using headless editor');

              const { value: updatedValue, selection: transformedSelection } = slateTransforms.applyFormat(
                block.value,
                selection,
                format,
                action,
                { url },
              );
              console.log('[VIEW] Headless editor updated value');

              // Update form state
              isInlineEditingRef.current = true;
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

              onChangeFormData(updatedForm);

              const message = {
                type: 'FORM_DATA',
                data: updatedForm,
                selection: transformedSelection,
              };
              console.log('[VIEW] Sending FORM_DATA from headless editor');
              event.source.postMessage(message, event.origin);
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

        case 'SLATE_PASTE_REQUEST':
          try {
            console.log('[VIEW] Received SLATE_PASTE_REQUEST:', event.data);
            const { blockId, html, selection } = event.data;
            const block = form.blocks[blockId];

            if (!block) {
              console.error('[VIEW] Block not found:', blockId);
              event.source.postMessage(
                {
                  type: 'SLATE_ERROR',
                  blockId,
                  error: 'Block not found',
                  originalRequest: event.data,
                },
                event.origin,
              );
              break;
            }

            // Deserialize pasted HTML to Slate
            const pastedSlate = slateTransforms.htmlToSlate(html);

            // Insert at selection
            const updatedValue = slateTransforms.insertNodes(
              block.value,
              selection,
              pastedSlate,
            );

            // Update form state
            isInlineEditingRef.current = true;
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

            onChangeFormData(updatedForm);

            // Send FORM_DATA to iframe (hydra.js will add nodeIds and render HTML)
            event.source.postMessage(
              {
                type: 'FORM_DATA',
                data: updatedForm,
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

            // Apply deletion transform
            const updatedValue = slateTransforms.applyDeletion(
              block.value,
              delSelection,
              direction,
            );

            // Update form state
            isInlineEditingRef.current = true;
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
            isInlineEditingRef.current = false;

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
          isInlineEditingRef.current = false;
          onChangeFormData(event.data.data);
          break;

        case 'GET_INITIAL_DATA':
          // Store the iframe's actual origin when it first contacts us
          iframeOriginRef.current = event.origin;
          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: form,
            },
            event.origin,
          );
          // If there's a selected block, send SELECT_BLOCK now that iframe is ready
          if (selectedBlock && !isInlineEditingRef.current) {
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
        //       isInlineEditingRef.current = true;
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

    console.log('[VIEW] FORM_DATA useEffect triggered:', {
      isInlineEditing: isInlineEditingRef.current,
      iframeReady: !!iframeOriginRef.current,
      hasForm: !!formToUse,
      selectedBlock,
      blockData: formToUse?.blocks?.[selectedBlock],
      usingRedux: !!formDataFromRedux,
      formDataFromReduxIdentity: formDataFromRedux,
      formPropIdentity: form,
    });
    // Only send FORM_DATA if iframe is ready (has sent GET_INITIAL_DATA)
    if (
      !isInlineEditingRef.current &&
      iframeOriginRef.current &&
      formToUse &&
      Object.keys(formToUse).length > 0
    ) {
      console.log('[VIEW] Sending FORM_DATA to iframe');
      // Send the form data to the iframe
      document
        .getElementById('previewIframe')
        ?.contentWindow?.postMessage(
          { type: 'FORM_DATA', data: formToUse },
          iframeOriginRef.current,
        );
    }
  }, [formDataFromRedux, form, selectedBlock]);

  const sidebarFocusEventListenerRef = useRef(null);

  useEffect(() => {
    const handleMouseHover = (e) => {
      e.stopPropagation();
      isInlineEditingRef.current = false;
      // console.log(
      //   'Sidebar or its child element focused!',
      //   isInlineEditingRef.current,
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
      <OpenObjectBrowser
        isInlineEditingRef={isInlineEditingRef}
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
                      isInlineEditingRef.current = false;
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
      />
    </div>
  );
};

export default Iframe;
