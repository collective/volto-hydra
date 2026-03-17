
import { createStore } from 'framework7/lite';

const store = createStore({
  state: {
    content: {},
    navigation: [],
    templates: {},
    apiBase: '',
    contextPath: '/',
  },
  getters: {
    content({ state }) {
      return state.content;
    },
    navigation({ state }) {
      return state.navigation;
    },
    templates({ state }) {
      return state.templates;
    },
    apiBase({ state }) {
      return state.apiBase;
    },
    contextPath({ state }) {
      return state.contextPath;
    },
  },
  actions: {
    setContent({ state }, content) {
      state.content = content;
    },
  },
})
export default store;
