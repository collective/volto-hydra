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

  const handleNavigateToUrl = useCallback(
    (givenUrl = null) => {
      if (!isValidUrl(givenUrl)) {
        return;
      }
      // Update adminUI URL with the new URL
      const formattedUrl = new URL(givenUrl);
      const newOrigin = formattedUrl.origin;
      Cookies.set('iframe_url', newOrigin, { expires: 7 });

      history.push(`${formattedUrl.pathname}`);
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
          handleNavigateToUrl(event.data.url);
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
    handleNavigateToUrl,
    history.location.pathname,
    iframeSrc,
    onChangeFormData,
    onSelectBlock,
    properties,
    token,
  ]);

  useEffect(() => {
    if (form && Object.keys(form).length > 0 && isValidUrl(iframeSrc)) {
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
