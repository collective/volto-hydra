import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Cookies from 'js-cookie';
import './styles.css';

const Iframe = () => {
  const [url, setUrl] = useState('');
  const [src, setSrc] = useState('');
  const history = useHistory();

  const getDefualtUrlFromEnv = () =>
    process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
    (typeof window !== 'undefined' && window.env['RAZZLE_DEFAULT_IFRAME_URL']);

  useEffect(() => {
    const defaultUrl = getDefualtUrlFromEnv() || 'http://localhost:3002'; // fallback if env is not set
    const savedUrl = Cookies.get('iframe_url');
    const initialUrl = savedUrl
      ? `${savedUrl}${window.location.pathname.replace('/edit', '')}`
      : `${defaultUrl}${window.location.pathname.replace('/edit', '')}`;

    setUrl(initialUrl);
    setSrc(initialUrl);

    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
      const { type, url } = event.data;
      const initialUrlOrigin = new URL(initialUrl).origin;
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      if (type === 'URL_CHANGE') {
        setUrl(url);
        handleNavigateToUrl(url);
      }
    });
  }, []);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleNavigateToUrl = (givenUrl = '') => {
    // Update adminUI URL with the new URL
    const formattedUrl = givenUrl ? new URL(givenUrl) : new URL(url);
    const newUrl = formattedUrl.href;
    setSrc(newUrl);
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
