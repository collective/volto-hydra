import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import './styles.css';

/**
 * Get the default URL from the environment
 * @returns {string} URL from the environment
 */
const getDefualtUrl = () =>
  process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
  (typeof window !== 'undefined' && window.env['RAZZLE_DEFAULT_IFRAME_URL']) ||
  'http://localhost:3002'; // fallback if env is not set

/**
 * Format the URL for the Iframe with location, token and enabling edit mode
 * @param {*} url
 * @param {*} token
 * @returns {string} URL with the admin params
 */
const getUrlWithAdminParams = (url, token) => {
  return `${url}${window.location.pathname.replace('/edit', '')}?access_token=${token}&_edit=true`;
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

const Iframe = () => {
  const [url, setUrl] = useState('');

  const [src, setSrc] = useState('');
  const history = useHistory();
  const token = useSelector((state) => state.userSession.token);
  const form = useSelector((state) => state.form.global);

  const defaultUrl = getDefualtUrl();
  const savedUrl = Cookies.get('iframe_url');
  const initialUrl = savedUrl
    ? getUrlWithAdminParams(savedUrl, token)
    : getUrlWithAdminParams(defaultUrl, token);

  setUrl(
    `${savedUrl || defaultUrl}${window.location.pathname.replace('/edit', '')}`,
  );
  setSrc(initialUrl);

  useEffect(() => {
    const initialUrlOrigin = new URL(initialUrl).origin;
    const messageHandler = (event) => {
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      const { type } = event.data;
      switch (type) {
        case 'URL_CHANGE': // URL change from the iframe
          setUrl(event.data.url);
          handleNavigateToUrl(event.data.url);
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
  }, [token]);

  useEffect(() => {
    if (Object.keys(form).length > 0 && isValidUrl(initialUrl)) {
      // Send the form data to the iframe
      const origin = new URL(initialUrl).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'FORM', data: form }, origin);
    }
  }, [form, initialUrl]);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleNavigateToUrl = useCallback(
    (givenUrl = null) => {
      if (!isValidUrl(givenUrl) && !isValidUrl(url)) {
        return;
      }
      // Update adminUI URL with the new URL
      const formattedUrl = givenUrl ? new URL(givenUrl) : new URL(url);
      // setSrc(getUrlWithAdminParams(formattedUrl.origin, token));
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
