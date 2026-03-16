import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { Icon } from '@plone/volto/components';
import clearSVG from '@plone/volto/icons/clear.svg';
import deleteSVG from '@plone/volto/icons/delete.svg';
import addSVG from '@plone/volto/icons/add.svg';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import getSavedURLs from '../../utils/getSavedURLs';
import isValidUrl from '../../utils/isValidUrl';
import { getSavedUrlsCookieName } from '../../utils/cookieNames';
import { getDomainInitials } from './FrontendSwitcherPanel';
import { setViewportWidths } from '../../actions';

/**
 * Modal for managing frontend URLs (add/remove) and viewport widths.
 * Environment URLs (from RAZZLE_DEFAULT_IFRAME_URL) cannot be removed.
 */
const FrontendSettingsModal = ({ onClose, onUrlsChanged }) => {
  const dispatch = useDispatch();
  const [urls, setUrls] = useState(() => getSavedURLs());
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const currentWidths = useSelector(
    (state) => state.viewportPreset?.widths || { mobile: 375, tablet: 768 },
  );
  const [mobileWidth, setMobileWidth] = useState(currentWidths.mobile);
  const [tabletWidth, setTabletWidth] = useState(currentWidths.tablet);

  // Environment URLs can't be removed
  const envUrls = new Set(getURlsFromEnv());

  const saveUrls = (updatedUrls) => {
    // Only save non-env URLs to cookie (env URLs are always merged by getSavedURLs)
    const customUrls = updatedUrls.filter((u) => !envUrls.has(u));
    const allEnvUrls = getURlsFromEnv();
    const cookieUrls = [...new Set([...customUrls, ...allEnvUrls])];
    Cookies.set(getSavedUrlsCookieName(), cookieUrls.join(','), {
      expires: 7,
    });
    setUrls(updatedUrls);
    onUrlsChanged();
  };

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setError('Invalid URL');
      return;
    }

    // Normalize: strip trailing slash from pathname (but not hash URLs)
    let normalized = trimmed;
    try {
      const urlObj = new URL(trimmed);
      if (!urlObj.hash) {
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      }
      normalized = urlObj.toString();
    } catch {
      // Use as-is if URL parsing fails
    }

    if (urls.includes(normalized)) {
      setError('URL already exists');
      return;
    }

    setError('');
    setNewUrl('');
    saveUrls([...urls, normalized]);
  };

  const handleRemove = (url) => {
    saveUrls(urls.filter((u) => u !== url));
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
            {urls.map((url) => {
              const isEnv = envUrls.has(url);
              return (
                <div key={url} className="frontend-settings-item">
                  <span className="frontend-switcher-url-icon">
                    {getDomainInitials(url)}
                  </span>
                  <span className="frontend-settings-item-url">
                    {url.replace(/^https?:\/\//, '')}
                  </span>
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
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://my-frontend.com"
              className="frontend-settings-input"
              autoFocus
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
