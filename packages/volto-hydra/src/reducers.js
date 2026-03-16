import { SET_FRONTEND_PREVIEW_URL, SET_VIEWPORT_PRESET, SET_VIEWPORT_WIDTHS } from './constants';

const initialState = {
  url: null,
};

export default function frontendPreviewUrl(state = initialState, action = {}) {
  switch (action.type) {
    case `${SET_FRONTEND_PREVIEW_URL}`:
      return {
        ...state,
        url: action.url,
      };

    default:
      return state;
  }
}

const viewportInitialState = {
  preset: 'desktop',
  widths: { mobile: 375, tablet: 768 },
};

export function viewportPreset(state = viewportInitialState, action = {}) {
  if (action.type === SET_VIEWPORT_PRESET) {
    return { ...state, preset: action.preset };
  }
  if (action.type === SET_VIEWPORT_WIDTHS) {
    return { ...state, widths: { ...state.widths, ...action.widths } };
  }
  return state;
}
