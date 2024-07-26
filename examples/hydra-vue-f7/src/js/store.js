
import { createStore } from 'framework7/lite';

const store = createStore({
  state: {
    content: {}
  },
  getters: {
    content({ state }) {
      return state.content;
    }
  },
  actions: {
    setContent({ state }, content) {
      state.content = content;
    },
  },
})
export default store;
