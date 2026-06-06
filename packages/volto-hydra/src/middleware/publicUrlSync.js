import config from '@plone/volto/registry';
import { SET_FRONTEND_PREVIEW_URL } from '../constants';
import getSavedURLs from '../utils/getSavedURLs';
import getCurrentFrontendPublicUrl from '../utils/getCurrentFrontendPublicUrl';

/**
 * Redux middleware that keeps `config.settings.publicURL` in sync with
 * the currently selected iframe frontend.
 *
 * In Hydra, "publicURL" means "where this content actually lives for
 * the public" — i.e. the publishUrl of whichever frontend the editor is
 * currently previewing. Switching frontends via FrontendSwitcherPanel
 * fires SET_FRONTEND_PREVIEW_URL; we listen and update settings before
 * the next render reads them.
 *
 * Stock Volto's RAZZLE_PUBLIC_URL knob would pin publicURL to a single
 * URL — incompatible with the multi-frontend model. Do NOT set it.
 */
const publicUrlSync = (_store) => (next) => (action) => {
  if (action.type === SET_FRONTEND_PREVIEW_URL) {
    const resolved = getCurrentFrontendPublicUrl(getSavedURLs(), action.url);
    if (resolved) config.settings.publicURL = resolved;
  }
  return next(action);
};

export default publicUrlSync;
