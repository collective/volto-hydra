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
import usePresetUrls from '../../utils/usePreseturls';
import isValidUrl from '../../utils/isValidUrl';
import { BlockChooser } from '@plone/volto/components';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import UrlInput from '../UrlInput';

/**
 * Format the URL for the Iframe with location, token and enabling edit mode
 * @param {*} url
 * @param {*} token
 * @returns {string} URL with the admin params
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
  // const [ready, setReady] = useState(false);
  // useEffect(() => {
  //   setReady(true);
  // }, []);
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
          offset: [0, -250],
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
  //-------------------------

  const [url, setUrl] = useState('');
  const [src, setSrc] = useState('');
  const history = useHistory();

  const presetUrls = usePresetUrls();
  const defaultUrl = presetUrls[0];
  const savedUrl = Cookies.get('iframe_url');
  const initialUrl = savedUrl
    ? getUrlWithAdminParams(savedUrl, token)
    : getUrlWithAdminParams(defaultUrl, token);

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
      if (!isValidUrl(givenUrl) && !isValidUrl(url)) {
        return;
      }
      // Update adminUI URL with the new URL
      const formattedUrl = givenUrl ? new URL(givenUrl) : new URL(url);
      const newOrigin = formattedUrl.origin;
      Cookies.set('iframe_url', newOrigin, { expires: 7 });

      history.push(`${formattedUrl.pathname}`);
    },
    [history, url],
  );

  useEffect(() => {
    setUrl(
      `${savedUrl || defaultUrl}${window.location.pathname.replace('/edit', '')}`,
    );
    setSrc(initialUrl);
  }, [savedUrl, defaultUrl, initialUrl]);

  useEffect(() => {
    //----------------Experimental----------------
    const onDeleteBlock = (id, selectPrev) => {
      const previous = previousBlockId(properties, id);
      const newFormData = deleteBlock(properties, id);
      onChangeFormData(newFormData);

      onSelectBlock(selectPrev ? previous : null);
      const origin = new URL(src).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage(
          { type: 'SELECT_BLOCK', uid: previous },
          origin,
        );
    };
    //----------------------------------------------
    const initialUrlOrigin = initialUrl ? new URL(initialUrl).origin : '';
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
    handleNavigateToUrl,
    history.location.pathname,
    initialUrl,
    onChangeFormData,
    onSelectBlock,
    properties,
    src,
    token,
  ]);

  useEffect(() => {
    if (form && Object.keys(form).length > 0 && isValidUrl(src)) {
      // Send the form data to the iframe
      const origin = new URL(src).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'FORM_DATA', data: form }, origin);
    }
  }, [form, initialUrl, src]);

  return (
    <div id="iframeContainer">
      <div className="input-container">
        <UrlInput urls={presetUrls} onSelect={handleNavigateToUrl} />
      </div>
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
                      const origin = new URL(src).origin;
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
        src={src}
        ref={setReferenceElement}
      />
    </div>
  );
};

export default Iframe;
