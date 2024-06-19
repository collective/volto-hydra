import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import './styles.css';

const Iframe = () => {
  const history = useHistory();
  const token = useSelector((state) => state.userSession.token);
  const form = useSelector((state) => state.form.global);
  const getDefualtUrlFromEnv = () =>
    process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
    (typeof window !== 'undefined' && window.env['RAZZLE_DEFAULT_IFRAME_URL']);

  const defaultUrl = getDefualtUrlFromEnv() || 'http://localhost:3002'; // fallback if env is not set
  const savedUrl = Cookies.get('iframe_url');
  const initialUrl = savedUrl
    ? `${savedUrl}${history.location.pathname.replace('/edit', '')}`
    : `${defaultUrl}${history.location.pathname.replace('/edit', '')}`;
  const [url, setUrl] = useState(initialUrl);
  const [src, setSrc] = useState(initialUrl);

  useEffect(() => {
    // Listen for messages from the iframe
    const initialUrlOrigin = new URL(initialUrl).origin;
    window.addEventListener('message', (event) => {
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      const { type } = event.data;
      switch (type) {
        case 'URL_CHANGE': // URL change from the iframe
          setUrl(event.data.url);
          handleNavigateToUrl(event.data.url);
          break;

        case 'GET_TOKEN': // Request for the token from the iframe
          event.source.postMessage(
            { type: 'GET_TOKEN_RESPONSE', token: token },
            event.origin,
          );
          break;

        default:
          break;
      }
    });
  }, [token]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(form).length > 0) {
      // Send the form data to the iframe
      const origin = new URL(initialUrl).origin;
      document
        .getElementById('previewIframe')
        .contentWindow.postMessage({ type: 'FORM', data: form }, origin);
    }
  }, [form]);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleNavigateToUrl = (givenUrl = '') => {
    // Update adminUI URL with the new URL
    const formattedUrl = givenUrl ? new URL(givenUrl) : new URL(url);
    // const newUrl = formattedUrl.href;
    // setSrc(newUrl);
    const newOrigin = formattedUrl.origin;
    Cookies.set('iframe_url', newOrigin, { expires: 7 });

    if (formattedUrl.pathname !== '/') {
      history.push(
        window.location.pathname.endsWith('/edit')
          ? `${formattedUrl.pathname}/edit`
          : `${formattedUrl.pathname}`,
      );
    } else {
      history.push(window.location.pathname.endsWith('/edit') ? `/edit` : `/`);
    }
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
