import { SET_SELECTED_BLOCK } from './constants';

const initialState = {
  uid: null,
};

export default function selectedBlock(state = initialState, action = {}) {
  switch (action.type) {
    case `${SET_SELECTED_BLOCK}`:
      return {
        ...state,
        uid: action.uid,
      };

    default:
      return state;
  }
}
