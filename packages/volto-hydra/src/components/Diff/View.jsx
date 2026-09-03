/**
 * Inka's compare view — replaces Volto's Diff route.
 *
 * Volto's diff renders both versions with Volto's OWN block components, which
 * a hydra admin deliberately doesn't have: the frontend is the only renderer.
 * So compare the way everything else renders here: TWO frontend iframes side
 * by side, each in `hydra-view:` mode (view markup, no edit chrome), each fed
 * its version's content as FORM_DATA the moment it says INIT — the same
 * push pipeline the editor uses, read-only.
 *
 * A unified inline text-diff is out of scope by design: there is no honest way
 * to line-diff two arbitrary frontend renders (see volto-hydra#327).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getContent } from '@plone/volto/actions/content/content';
import { getBaseUrl } from '@plone/volto/helpers/Url/Url';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import { getIframeUrlCookieName } from '../../utils/cookieNames';

const panelStyle = {
  flex: '1 1 0',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #ccc',
  borderRadius: '4px',
  overflow: 'hidden',
};

const VersionPane = ({ label, when, actor, src, iframeName, content }) => {
  const ref = useRef(null);
  // Answer THIS iframe's INIT with THIS version's content. The listener stays
  // for the iframe's lifetime: a reload (dev, viewport change) re-INITs and
  // must be re-fed the same version.
  useEffect(() => {
    if (!content) return undefined;
    const onMessage = (event) => {
      if (event.source !== ref.current?.contentWindow) return;
      if (event.data?.type !== 'INIT') return;
      ref.current.contentWindow.postMessage(
        { type: 'FORM_DATA', data: content },
        '*',
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [content]);
  return (
    <div style={panelStyle}>
      <div style={{ padding: '0.5em 1em', background: '#f3f5f7', borderBottom: '1px solid #ccc' }}>
        <strong>{label}</strong>
        {when ? <span style={{ marginLeft: '0.75em', color: '#666' }}>{when}</span> : null}
        {actor ? <span style={{ marginLeft: '0.75em', color: '#666' }}>{actor}</span> : null}
      </div>
      <iframe
        ref={ref}
        title={label}
        name={iframeName}
        src={src}
        style={{ flex: 1, width: '100%', border: 0, minHeight: '70vh' }}
      />
    </div>
  );
};

const HydraDiff = (props) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const path = getBaseUrl(location.pathname);
  const params = new URLSearchParams(location.search);
  const one = params.get('one') ?? undefined;
  const two = params.get('two') ?? undefined;
  const [versions, setVersions] = useState({});

  const adminOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const iframeName = `hydra-view:${adminOrigin}`;
  const urlFromEnv = getURlsFromEnv();
  const cookieMatch =
    typeof document !== 'undefined' &&
    document.cookie.match(new RegExp(`${getIframeUrlCookieName()}=([^;]+)`));
  const previewBase =
    useSelector((state) => state.frontendPreviewUrl?.url) ||
    (cookieMatch ? decodeURIComponent(cookieMatch[1]) : null) ||
    urlFromEnv[0]?.url;
  const src = previewBase ? `${previewBase.replace(/\/$/, '')}${path === '/' ? '' : path}` : null;

  useEffect(() => {
    let cancelled = false;
    const load = async (version, key) => {
      // getContent(version) hits @history/<version>; dispatch resolves with
      // the response body, which IS the content at that version.
      const data = await dispatch(getContent(path, version, `diff-${key}`));
      if (!cancelled) setVersions((v) => ({ ...v, [key]: data }));
    };
    if (one !== undefined) load(one, 'one');
    if (two !== undefined) load(two, 'two');
    return () => {
      cancelled = true;
    };
  }, [dispatch, path, one, two]);

  return (
    <div id="page-diff" style={{ padding: '1em' }}>
      <h1 style={{ marginBottom: '0.25em' }}>Compare versions</h1>
      <p style={{ color: '#666' }}>
        Two versions of <code>{path}</code>, rendered exactly as visitors see
        them. <Link to={`${path === '/' ? '' : path}/historyview`}>Back to history</Link>
      </p>
      {!src ? (
        <p>No frontend preview URL configured.</p>
      ) : (
        <div style={{ display: 'flex', gap: '1em', alignItems: 'stretch' }}>
          <VersionPane
            label={`Version ${one}`}
            when={versions.one?.modified || versions.one?.time}
            src={src}
            iframeName={iframeName}
            content={versions.one}
          />
          <VersionPane
            label={two === 'current' ? 'Current' : `Version ${two}`}
            when={versions.two?.modified || versions.two?.time}
            src={src}
            iframeName={iframeName}
            content={versions.two}
          />
        </div>
      )}
    </div>
  );
};

export default HydraDiff;
