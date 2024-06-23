import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import Cookies from 'js-cookie';
import {
  addBlock,
  applyBlockDefaults,
  deleteBlock,
  getBlocksFieldname,
  previousBlockId,
} from '@plone/volto/helpers';
import './styles.css';
import { useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import usePresetUrls from '../../utils/usePreseturls';
import isValidUrl from '../../utils/isValidUrl';

/**
 * Format the URL for the Iframe with location, token and enabling edit mode
 * @param {*} url
 * @param {*} token
 * @returns {string} URL with the admin params
 */
const getUrlWithAdminParams = (url, token) => {
  if (typeof window !== 'undefined') {
    if (window.location.pathname.endsWith('/edit')) {
      return `${url}${window.location.pathname.replace('/edit', '')}?access_token=${token}&_edit=true`;
    } else {
      return `${url}${window.location.pathname}?access_token=${token}&_edit=false`;
    }
  }
  return null;
};

const Iframe = (props) => {
  // ----Experimental----
  const {
    onSelectBlock,
    properties,
    editable,
    onChangeFormData,
    metadata,
    formData: form,
    token,
  } = props;
  //-------------------------

  const [url, setUrl] = useState('');
  const [src, setSrc] = useState('');
  const history = useHistory();

  const presetUrls = usePresetUrls();
  const defaultUrl = presetUrls[0] || 'http://localhost:3002';
  const savedUrl = Cookies.get('iframe_url');
  const initialUrl = savedUrl
    ? getUrlWithAdminParams(savedUrl, token)
    : getUrlWithAdminParams(defaultUrl, token);

  //-----Experimental-----
  const intl = useIntl();
  const onAddBlock = (type, index) => {
    if (editable) {
      const [id, newFormData] = addBlock(properties, type, index);
      const blocksFieldname = getBlocksFieldname(newFormData);
      const blockData = newFormData[blocksFieldname][id];
      newFormData[blocksFieldname][id] = applyBlockDefaults({
        data: blockData,
        intl,
        metadata,
        properties,
      });
      onChangeFormData(newFormData);
      const origin = new URL(src).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'SELECT_BLOCK', uid: id }, origin);
      return id;
    }
  };

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

      if (formattedUrl.pathname !== '/') {
        history.push(
          window.location.pathname.endsWith('/edit')
            ? `${formattedUrl.pathname}/edit`
            : `${formattedUrl.pathname}`,
        );
      } else {
        history.push(
          window.location.pathname.endsWith('/edit') ? `/edit` : `/`,
        );
      }
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
          }
          break;

        case 'ADD_BLOCK':
          //----Experimental----
          onSelectBlock(
            onAddBlock(
              config.settings.defaultBlockType,
              form?.blocks_layout?.items.indexOf(event.data.uid)
                ? form?.blocks_layout?.items.indexOf(event.data.uid) + 1
                : -1,
            ),
          );
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
  }, [handleNavigateToUrl, history.location.pathname, initialUrl, token]);

  useEffect(() => {
    if (form && Object.keys(form).length > 0 && isValidUrl(src)) {
      // Send the form data to the iframe
      const origin = new URL(src).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'FORM', data: form }, origin);
    }
  }, [form, initialUrl]);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  return (
    <div id="iframeContainer">
      <div className="input-container">
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter URL"
          className="iframe-input-field"
        />
        <button
          onClick={() => handleNavigateToUrl(url)}
          className="iframe-input-button"
        >
          ➔
        </button>
      </div>
      <iframe id="previewIframe" title="Preview" src={src} />
    </div>
  );
};

export default Iframe;
