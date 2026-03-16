import { SET_FRONTEND_PREVIEW_URL, SET_VIEWPORT_PRESET, SET_VIEWPORT_WIDTHS } from './constants';

export function setFrontendPreviewUrl(url) {
  return {
    type: SET_FRONTEND_PREVIEW_URL,
    url: url,
  };
}

export function setViewportPreset(preset) {
  return {
    type: SET_VIEWPORT_PRESET,
    preset,
  };
}

export function setViewportWidths(widths) {
  return {
    type: SET_VIEWPORT_WIDTHS,
    widths,
  };
}
