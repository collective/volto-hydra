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
  // Optional: only set when the published frontend lives at a different
  // origin than the edit-mode one. Recognised by the Url-helper shadow so
  // links pasted from the published origin still flatten to /paths.
  const [newPublishUrl, setNewPublishUrl] = useState('');
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

  const normalizeUrlInput = (raw) => {
    try {
      const urlObj = new URL(raw);
      if (!urlObj.hash) {
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      }
      return urlObj.toString();
    } catch {
      return raw;
    }
  };

  const handleAdd = () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) return;

    if (!isValidUrl(trimmedUrl)) {
      setError('Invalid URL');
      return;
    }

    const normalized = normalizeUrlInput(trimmedUrl);

    if (entries.some((e) => e.url === normalized)) {
      setError('URL already exists');
      return;
    }

    const trimmedPublishUrl = newPublishUrl.trim();
    let normalizedPublishUrl = '';
    if (trimmedPublishUrl) {
      if (!isValidUrl(trimmedPublishUrl)) {
        setError('Invalid Publish URL');
        return;
      }
      normalizedPublishUrl = normalizeUrlInput(trimmedPublishUrl);
    }

    setError('');
    const trimmedName = newName.trim();
    const newEntry = {
      url: normalized,
      name: trimmedName || normalized.replace(/^https?:\/\//, ''),
    };
    if (normalizedPublishUrl) newEntry.publishUrl = normalizedPublishUrl;
    setNewName('');
    setNewUrl('');
    setNewPublishUrl('');
    saveEntries([...entries, newEntry]);
  };

  const handleRemove = (url) => {
    saveEntries(entries.filter((e) => e.url !== url));
  };

  const handleRename = (url, newNameValue) => {
    saveEntries(entries.map((e) => (e.url === url ? { ...e, name: newNameValue } : e)));
  };

  const handlePublishUrlChange = (url, value) => {
    const trimmed = (value || '').trim();
    saveEntries(
      entries.map((e) => {
        if (e.url !== url) return e;
        if (!trimmed) {
          // Drop the field entirely so serialiseEntries keeps the legacy
          // 2-part `Name|URL` shape — avoids spurious cookie changes when
          // the user clears the input.
          const { publishUrl, ...rest } = e;
          return rest;
        }
        return { ...e, publishUrl: trimmed };
      }),
    );
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
            {entries.map(({ url, name, publishUrl }) => {
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
                    <input
                      type="text"
                      value={publishUrl || ''}
                      onChange={(e) =>
                        handlePublishUrlChange(url, e.target.value)
                      }
                      placeholder="Publish URL (optional)"
                      className="frontend-settings-publish-input"
                      aria-label={`Publish URL for ${url}`}
                    />
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
              // No autoFocus: Volto 19's Toolbar adds an onBlur handler on
              // toolbarWindow that calls closeMenu() when focus shifts
              // outside the toolbar. This modal portals to document.body
              // (outside toolbarWindow), so autoFocus here would
              // immediately blur the toolbar -> menu closes -> our panel
              // unmounts -> this modal unmounts.
              aria-label="URL"
            />
            <input
              type="text"
              value={newPublishUrl}
              onChange={(e) => {
                setNewPublishUrl(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Publish URL (optional)"
              className="frontend-settings-input frontend-settings-publish-input"
              aria-label="Publish URL"
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
    // Portal target: prefer the Volto toolbar window (.toolbar-content) so
    // focus shifts inside the modal stay "inside the toolbar" from the
    // toolbar's perspective. Volto 19 added an onBlur on toolbarWindow that
    // calls closeMenu() when focus moves to a relatedTarget OUTSIDE
    // toolbarWindow — autoFocus or fill() on our inputs would otherwise
    // immediately collapse the parent panel and unmount us. Fall back to
    // document.body if the toolbar isn't mounted (e.g. tests/SSR).
    document.querySelector('.toolbar-content') || document.body,
  );
};

export default FrontendSettingsModal;
