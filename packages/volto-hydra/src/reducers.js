import { SET_FRONTEND_PREVIEW_URL } from './constants';

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
