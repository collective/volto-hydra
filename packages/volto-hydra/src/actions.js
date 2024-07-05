import { SET_FRONTEND_PREVIEW_URL } from './constants';

export function setFrontendPreviewUrl(url) {
  return {
    type: SET_FRONTEND_PREVIEW_URL,
    url: url,
  };
}
