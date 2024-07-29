
import { createStore } from 'framework7/lite';

const store = createStore({
  state: {
    content: {},
    navigation: []
  },
  getters: {
    content({ state }) {
      return state.content;
    },
    navigation({ state }) {
      return state.navigation;
    }
  },
  actions: {
    setContent({ state }, content) {
      state.content = content;
    },
  },
})
export default store;
