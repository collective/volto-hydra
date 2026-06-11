/**
 * Unit tests for the Hydra shadow of @plone/volto/helpers/Url/Url.
 *
 * The shadow extends `flattenToAppURL` and `isInternalURL` so they
 * recognise iframe-frontend URLs registered in the saved-URLs cookie /
 * RAZZLE_DEFAULT_IFRAME_URL env. Without this, pasting a link from a
 * published frontend ("https://www.example.com/about") into a Volto
 * widget would be stored as an absolute URL — break resolveuid, break
 * cross-environment portability.
 *
 * Volto's stock helper only knows about `settings.apiPath`,
 * `settings.internalApiPath`, and `settings.publicURL` (which Volto
 * conflates with admin URL). It cannot strip the frontend's published
 * origin.
 */

import Cookies from 'js-cookie';
import config from '@plone/volto/registry';
import { getSavedUrlsCookieName } from '../../../../utils/cookieNames';
import { flattenToAppURL, isInternalURL } from './Url';

beforeEach(() => {
  // Make config.settings deterministic — flattenToAppURL strips these
  // first, so we set them to no-op values that won't accidentally match
  // our test URLs.
  config.settings.apiPath = 'http://api.localhost';
  config.settings.internalApiPath = '';
  config.settings.publicURL = 'http://admin.localhost';
  config.settings.externalRoutes = [];
});

afterEach(() => {
  Cookies.remove(getSavedUrlsCookieName());
});

describe('flattenToAppURL (Hydra shadow)', () => {
  it('strips Volto apiPath like the stock helper', () => {
    expect(flattenToAppURL('http://api.localhost/foo/bar')).toBe('/foo/bar');
  });

  it('strips a known frontend edit URL', () => {
    Cookies.set(
      getSavedUrlsCookieName(),
      'Edit|https://edit.example.com',
    );
    expect(flattenToAppURL('https://edit.example.com/about')).toBe('/about');
  });

  it('strips a known frontend publish URL (different origin than edit)', () => {
    Cookies.set(
      getSavedUrlsCookieName(),
      'Site|https://edit.example.com|https://www.example.com',
    );
    expect(flattenToAppURL('https://www.example.com/about')).toBe('/about');
  });

  it('leaves an unknown absolute URL untouched', () => {
    expect(flattenToAppURL('https://unrelated.example.org/x')).toBe(
      'https://unrelated.example.org/x',
    );
  });
});

describe('isInternalURL (Hydra shadow)', () => {
  it('treats a known frontend publish URL as internal', () => {
    Cookies.set(
      getSavedUrlsCookieName(),
      'Site|https://edit.example.com|https://www.example.com',
    );
    expect(isInternalURL('https://www.example.com/about')).toBe(true);
  });

  it('still rejects unknown absolute URLs', () => {
    expect(isInternalURL('https://elsewhere.example.org/x')).toBe(false);
  });
});
