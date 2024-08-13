import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
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
import addNodeIds from '../../utils/addNodeIds';

/**
 * Format the URL for the Iframe with location, token and edit mode
 * @param {URL} url
 * @param {String} token
 * @returns {URL} URL with the admin params
 */
const getUrlWithAdminParams = (url, token) => {
  return typeof window !== 'undefined'
    ? window.location.pathname.endsWith('/edit')
      ? `${url}${window.location.pathname.replace('/edit', '')}?access_token=${token}&_edit=true`
      : `${url}${window.location.pathname}?access_token=${token}&_edit=false`
    : null;
};

const Iframe = (props) => {
  // ----Experimental----
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
    document
      .getElementById('previewIframe')
      .contentWindow.postMessage(
        { type: 'SELECT_BLOCK', uid: selectedBlock },
        '*',
      );
  }, [selectedBlock]);
  //-------------------------

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

  //-----Experimental-----
  const intl = useIntl();

  const onInsertBlock = (id, value, current) => {
    if (value?.['@type'] === 'slate') {
      value = { ...value, value: [{ type: 'p', children: [{ text: '' }] }] };
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
  //---------------------------
  /**
   * Handle the navigation to a new URL
   * @param {URL} givenUrlObject
   * @param {Boolean} isRoutingWithHash
   */
  const handleNavigateToUrl = useCallback(
    (givenUrlObject, isRoutingWithHash) => {
      if (!isValidUrl(givenUrlObject.href)) {
        return;
      }
      // Update adminUI URL with the new URL
      const newOrigin = givenUrlObject.origin;
      Cookies.set('iframe_url', newOrigin, { expires: 7 });
      const hash = givenUrlObject.hash;
      if (isRoutingWithHash) {
        const pathname = hash.replace('#!', '');
        history.push(`${pathname}`);
      } else {
        history.push(`${givenUrlObject.pathname}`);
      }
    },
    [history],
  );

  useEffect(() => {
    //----------------Experimental----------------
    const onDeleteBlock = (id, selectPrev) => {
      const previous = previousBlockId(properties, id);
      const newFormData = deleteBlock(properties, id);
      onChangeFormData(newFormData);

      onSelectBlock(selectPrev ? previous : null);
      const origin = new URL(iframeSrc).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage(
          { type: 'SELECT_BLOCK', uid: previous },
          origin,
        );
    };
    //----------------------------------------------
    const initialUrlOrigin = iframeSrc && new URL(iframeSrc).origin;
    const messageHandler = (event) => {
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      const { type } = event.data;
      switch (type) {
        case 'URL_CHANGE': // URL change from the iframe
          handleNavigateToUrl(
            new URL(event.data.url),
            event.data.isRoutingWithHash,
          );
          break;

        case 'OPEN_SETTINGS':
          if (history.location.pathname.endsWith('/edit')) {
            onSelectBlock(event.data.uid);
            setAddNewBlockOpened(false);
            dispatch(setSidebarTab(1));
          }
          break;

        case 'ADD_BLOCK':
          //----Experimental----
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

        // case 'INLINE_EDIT_ENTER':
        //   isInlineEditingRef.current = true; // Set to true to prevent sending form data to iframe
        //   const updatedJson = addNodeIds(form.blocks[selectedBlock]);
        //   onChangeFormData({
        //     ...form,
        //     blocks: { ...form.blocks, [selectedBlock]: updatedJson },
        //   });
        //   break;

        case 'INLINE_EDIT_DATA':
          isInlineEditingRef.current = true;
          console.log(
            'Inline data recieved',
            event.data.data?.blocks[selectedBlock],
          );
          onChangeFormData(event.data.data);
          break;

        case 'INLINE_EDIT_EXIT':
          isInlineEditingRef.current = false;
          break;

        case 'TOGGLE_MARK':
          console.log('TOGGLE_BOLD', event.data.html);
          isInlineEditingRef.current = true;
          const deserializedHTMLData = toggleMark(event.data.html);
          console.log('deserializedHTMLData', deserializedHTMLData);
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
    dispatch,
    form,
    form?.blocks,
    handleNavigateToUrl,
    history.location.pathname,
    iframeSrc,
    onChangeFormData,
    onSelectBlock,
    properties,
    selectedBlock,
    token,
  ]);

  useEffect(() => {
    // console.log('form data changed', form?.blocks[selectedBlock]);
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

  return (
    <div id="iframeContainer">
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
                      const origin = new URL(iframeSrc).origin;
                      document
                        .getElementById('previewIframe')
                        .contentWindow.postMessage(
                          {
                            type: 'SELECT_BLOCK',
                            uid: newId,
                          },
                          origin,
                        );
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
