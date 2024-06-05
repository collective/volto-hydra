import React, { useState, useEffect } from 'react';

const Iframe = () => {
  const [url, setUrl] = useState('');
  const [src, setSrc] = useState(url);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialUrl = `http://localhost:3002${window.location.pathname.replace('/edit', '')}`;
      setUrl(initialUrl);
      setSrc(initialUrl);

      // Listen for messages from the iframe
      window.addEventListener('message', (event) => {
        const { type, url } = event.data;
        if (event.origin !== 'http://localhost:3002') {
          return;
        }
        if (type === 'URL_CHANGE') {
          // console.log('URL_CHANGE', url);
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
    formattedUrl.host = 'localhost:3000';
    window.location.href = window.location.pathname.endsWith('/edit')
      ? `${formattedUrl.href}/edit`
      : formattedUrl.href;
  };

  return (
    <div
      className="iframe-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '65vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        className="input-container"
        style={{
          display: 'flex',
          width: 'calc(65vh * 1.6)',
          marginBottom: '10px',
        }}
      >
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter URL"
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px 0 0 4px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleNavigateToUrl}
          style={{
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderLeft: 'none',
            backgroundColor: '#007bff',
            color: '#fff',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
          }}
        >
          ➔
        </button>
      </div>
      <iframe
        id="previewIframe"
        title="Preview"
        src={src}
        style={{
          width: 'calc(65vh * 1.6)', // Maintain a 16:10 aspect ratio (or adjust as needed)
          height: '100%',
          border: 'none',
          transform: 'scale(0.9)', // Adjust scale as necessary
          transformOrigin: '0 0',
        }}
      />
    </div>
  );
};

export default Iframe;
