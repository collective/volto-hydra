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
    formData: form,
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
    const origin = iframeSrc && new URL(iframeSrc).origin;

    !isInlineEditingRef.current &&
      document.getElementById('previewIframe').contentWindow.postMessage(
        {
          type: 'SELECT_BLOCK',
          uid: selectedBlock,
          method: 'select',
          data: form,
        },
        origin,
      );
  }, [selectedBlock]);

  const isInlineEditingRef = useRef(false);
  const [iframeSrc, setIframeSrc] = useState(null);
  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get('iframe_url') ||
    urlFromEnv[0];

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

        case 'UPDATE_BLOCKS_LAYOUT':
          isInlineEditingRef.current = false;
          onChangeFormData(event.data.data);
          break;

        case 'GET_INITIAL_DATA':
          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: form,
            },
            event.origin,
          );
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
    // console.log('isInlineEditingRef.current', isInlineEditingRef.current);
    if (
      !isInlineEditingRef.current &&
      form &&
      Object.keys(form).length > 0 &&
      isValidUrl(iframeSrc)
    ) {
      // Send the form data to the iframe
      const origin = new URL(iframeSrc).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'FORM_DATA', data: form }, origin);
    }
  }, [form, iframeSrc]);

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
