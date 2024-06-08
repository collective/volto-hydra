import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './styles.css';

const Iframe = () => {
  const [url, setUrl] = useState('');
  const [src, setSrc] = useState(url);
  const history = useHistory();
  const token = useSelector((state) => state.userSession.token);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialUrl = `http://localhost:3002${window.location.pathname.replace('/edit', '')}`;
      setUrl(initialUrl);
      setSrc(initialUrl);

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
    }
  }, [token]);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleNavigateToUrl = (givenUrl = '') => {
    // Update adminUI URL with the new URL
    const formattedUrl = url ? new URL(url) : new URL(givenUrl);
    setSrc(formattedUrl.href);
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
        <button onClick={handleNavigateToUrl} className="iframe-input-button">
          ➔
        </button>
      </div>
      <iframe id="previewIframe" title="Preview" src={src} />
    </div>
  );
};

export default Iframe;
