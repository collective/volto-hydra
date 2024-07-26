
import Page from '../pages/page.vue';
import NotFoundPage from '../pages/404.vue';
import axios from 'axios';

// In Layout.js or App.js
import { initBridge } from './hydra.js';
const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video']});


var routes = [
  {
    path: '{/:path}*',
    browserHistory: true,
    async: function ({ router, to, resolve }) {

      //const token = url.searchParams.get("access_token", null);  
  
      // App instance
      var app = router.app;

      // Show Preloader
      app.preloader.show();
      // User ID from request
      var path = to.path;

      const url = new URL(window.location.href);
      const token = url.searchParams.get("access_token");
      var headers = {};
      if (token) {
        headers = {'Authorization': 'Bearer '+token};
      };
      const api = "https://hydra.pretagov.com/++api++"+path+"?expand=breadcrumbs,navroot,navigation&expand.navigation.depth=1"
      axios.get(api, {headers}).then((response) => {
        var data = response.data;
        // Hide Preloader
        app.preloader.hide();

        //this.$root.panelProps.data = data;

        // Resolve route to load page
        resolve(
          {
            component: Page,
          },
          {
            props: {
              data: data,
            }
          }
        );
      });
    }
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;
