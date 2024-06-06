import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import './styles.css';

const Iframe = () => {
  const [url, setUrl] = useState('');
  const [src, setSrc] = useState(url);
  const history = useHistory();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialUrl = `http://localhost:3002${window.location.pathname.replace('/edit', '')}`;
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
    }
  }, []);

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleNavigateToUrl = (givenUrl = '') => {
    // Update adminUI URL with the new URL
    const formattedUrl = url ? new URL(url) : new URL(givenUrl);
    setSrc(formattedUrl.href);
    history.push(
      window.location.pathname.endsWith('/edit')
        ? `${formattedUrl.pathname}/edit`
        : `${formattedUrl.pathname}`,
    );
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
