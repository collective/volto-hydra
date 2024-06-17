import { SET_SELECTED_BLOCK } from './constants';

export function setSelectedBlock(uid) {
  return {
    type: SET_SELECTED_BLOCK,
    uid: uid,
  };
}
