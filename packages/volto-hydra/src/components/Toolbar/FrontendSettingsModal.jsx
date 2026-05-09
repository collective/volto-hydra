import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { Icon } from '@plone/volto/components';
import clearSVG from '@plone/volto/icons/clear.svg';
import deleteSVG from '@plone/volto/icons/delete.svg';
import addSVG from '@plone/volto/icons/add.svg';
import { getURlsFromEnv, serialiseEntries } from '../../utils/getSavedURLs';
import getSavedURLs from '../../utils/getSavedURLs';
import isValidUrl from '../../utils/isValidUrl';
import { getSavedUrlsCookieName } from '../../utils/cookieNames';
import getDomainInitials from '../../utils/getDomainInitials';
import { setViewportWidths } from '../../actions';

/**
 * Modal for managing frontend URLs (add/remove) and viewport widths.
 * Environment URLs (from RAZZLE_DEFAULT_IFRAME_URL) cannot be removed.
 *
 * Uses a native mousedown capture listener to prevent Volto's toolbar
 * click-outside handler from closing the panel while the modal is open.
 */
const FrontendSettingsModal = ({ onClose, onUrlsChanged }) => {
  const dispatch = useDispatch();
  const overlayRef = useRef(null);
  const [entries, setEntries] = useState(() => getSavedURLs());
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const currentWidths = useSelector(
    (state) => state.viewportPreset?.widths || { mobile: 375, tablet: 768 },
  );
  const [mobileWidth, setMobileWidth] = useState(currentWidths.mobile);
  const [tabletWidth, setTabletWidth] = useState(currentWidths.tablet);

  // Prevent toolbar's document-level mousedown handler from closing the panel.
  // Must use native capture listener since the toolbar uses addEventListener directly.
  useEffect(() => {
    const stop = (e) => e.stopPropagation();
    document.addEventListener('mousedown', stop, true);
    return () => document.removeEventListener('mousedown', stop, true);
  }, []);

  // Environment entries can't be removed (renaming is allowed — the
  // user-edited name takes precedence via cookie merge in getSavedURLs).
  const envUrls = new Set(getURlsFromEnv().map((e) => e.url));

  const saveEntries = (updatedEntries) => {
    Cookies.set(getSavedUrlsCookieName(), serialiseEntries(updatedEntries), {
      expires: 7,
    });
    setEntries(updatedEntries);
    onUrlsChanged();
  };

  const handleAdd = () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) return;

    if (!isValidUrl(trimmedUrl)) {
      setError('Invalid URL');
      return;
    }

    let normalized = trimmedUrl;
    try {
      const urlObj = new URL(trimmedUrl);
      if (!urlObj.hash) {
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      }
      normalized = urlObj.toString();
    } catch {
      // Use as-is if URL parsing fails
    }

    if (entries.some((e) => e.url === normalized)) {
      setError('URL already exists');
      return;
    }

    setError('');
    const trimmedName = newName.trim();
    setNewName('');
    setNewUrl('');
    saveEntries([
      ...entries,
      { url: normalized, name: trimmedName || normalized.replace(/^https?:\/\//, '') },
    ]);
  };

  const handleRemove = (url) => {
    saveEntries(entries.filter((e) => e.url !== url));
  };

  const handleRename = (url, newNameValue) => {
    saveEntries(entries.map((e) => (e.url === url ? { ...e, name: newNameValue } : e)));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleWidthChange = (preset, value) => {
    const num = parseInt(value, 10);
    if (preset === 'mobile') setMobileWidth(num || '');
    if (preset === 'tablet') setTabletWidth(num || '');
  };

  const handleWidthBlur = () => {
    const m = parseInt(mobileWidth, 10) || 375;
    const t = parseInt(tabletWidth, 10) || 768;
    setMobileWidth(m);
    setTabletWidth(t);
    dispatch(setViewportWidths({ mobile: m, tablet: t }));
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="frontend-settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="frontend-settings-modal">
        <div className="frontend-settings-header">
          <h3>Display Settings</h3>
          <button
            className="frontend-settings-close"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name={clearSVG} size="20px" />
          </button>
        </div>

        <div className="frontend-settings-body">
          {/* Frontend URLs */}
          <div className="frontend-settings-section-label">Frontend URLs</div>
          <div className="frontend-settings-list">
            {entries.map(({ url, name }) => {
              const isEnv = envUrls.has(url);
              return (
                <div key={url} className="frontend-settings-item">
                  <span className="frontend-switcher-url-icon">
                    {getDomainInitials(url)}
                  </span>
                  <div className="frontend-settings-item-text">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleRename(url, e.target.value)}
                      placeholder={url.replace(/^https?:\/\//, '')}
                      className="frontend-settings-name-input"
                      aria-label={`Name for ${url}`}
                    />
                    <span className="frontend-settings-item-url">
                      {url.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  {!isEnv && (
                    <button
                      className="frontend-settings-remove"
                      onClick={() => handleRemove(url)}
                      aria-label={`Remove ${url}`}
                      title="Remove"
                    >
                      <Icon name={deleteSVG} size="18px" />
                    </button>
                  )}
                  {isEnv && (
                    <span className="frontend-settings-env-badge">env</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new URL */}
          <div className="frontend-settings-add">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Name (optional)"
              className="frontend-settings-input frontend-settings-name-input"
              aria-label="Name"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://my-frontend.com"
              className="frontend-settings-input frontend-settings-url-input"
              autoFocus
              aria-label="URL"
            />
            <button
              className="frontend-settings-add-btn"
              onClick={handleAdd}
              disabled={!newUrl.trim()}
              aria-label="Add URL"
            >
              <Icon name={addSVG} size="20px" />
            </button>
          </div>
          {error && <div className="frontend-settings-error">{error}</div>}

          {/* Viewport widths */}
          <div className="frontend-settings-section-label" style={{ marginTop: '16px' }}>
            Viewport Widths
          </div>
          <div className="frontend-settings-widths">
            <div className="frontend-settings-width-row">
              <label>Mobile</label>
              <input
                type="number"
                value={mobileWidth}
                onChange={(e) => handleWidthChange('mobile', e.target.value)}
                onBlur={handleWidthBlur}
                className="frontend-settings-width-input"
                min="200"
                max="600"
              />
              <span className="frontend-settings-width-unit">px</span>
            </div>
            <div className="frontend-settings-width-row">
              <label>Tablet</label>
              <input
                type="number"
                value={tabletWidth}
                onChange={(e) => handleWidthChange('tablet', e.target.value)}
                onBlur={handleWidthBlur}
                className="frontend-settings-width-input"
                min="500"
                max="1200"
              />
              <span className="frontend-settings-width-unit">px</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FrontendSettingsModal;
