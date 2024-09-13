
import Page from '../pages/page.vue';
import NotFoundPage from '../pages/404.vue';
import axios from 'axios';


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
      const api = "https://hydra-api.pretagov.com/++api++"+path+"?expand=breadcrumbs,navroot,navigation&expand.navigation.depth=2"
      axios.get(api, {headers}).then((response) => {
        app.store.state.content = response.data;
        app.store.state.navigation = response.data["@components"].navigation.items;
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
