import {
  SET_FRONTEND_PREVIEW_URL,
  SET_VIEWPORT_PRESET,
  SET_VIEWPORT_WIDTHS,
  SET_LINKABLE_ANCHORS,
} from './constants';

// Transient store of the deep-link anchors for the page being edited:
// { [blockUid]: [{ id, name }] }. Held OUT of the blocks during editing (so
// anchor updates never mutate formData / re-render the iframe); seeded from the
// blocks on load, merged back into the blocks on save.
export function setLinkableAnchors(anchors) {
  return {
    type: SET_LINKABLE_ANCHORS,
    anchors: anchors || {},
  };
}

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
