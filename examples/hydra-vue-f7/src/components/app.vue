<template>
  <f7-app v-bind="f7params" >

  <!-- Left panel with cover effect-->
  <f7-panel left cover dark>
    <f7-view>
      <f7-page>
        <f7-navbar title="Left Panel"></f7-navbar>
        <f7-block>Left panel content goes here</f7-block>
      </f7-page>
    </f7-view>
  </f7-panel>


  <!-- Right panel with reveal effect-->
  <f7-panel @panel:open="refreshMenu"  right reveal dark>
    <SideMenu :key="number"/>
  </f7-panel>


  <!-- Your main view, should have "view-main" class -->
  <f7-view main class="safe-areas" url="/"></f7-view>


    <!-- Popup -->
    <f7-popup id="my-popup">
      <f7-view>
        <f7-page>
          <f7-navbar title="Popup">
            <f7-nav-right>
              <f7-link popup-close>Close</f7-link>
            </f7-nav-right>
          </f7-navbar>
          <f7-block>
            <p>Popup content goes here.</p>
          </f7-block>
        </f7-page>
      </f7-view>
    </f7-popup>

    <f7-login-screen id="my-login-screen">
      <f7-view>
        <f7-page login-screen>
          <f7-login-screen-title>Login</f7-login-screen-title>
          <f7-list form>
            <f7-list-input
              type="text"
              name="username"
              placeholder="Your username"
              v-model:value="username"
            ></f7-list-input>
            <f7-list-input
              type="password"
              name="password"
              placeholder="Your password"
              v-model:value="password"
            ></f7-list-input>
          </f7-list>
          <f7-list>
            <f7-list-button title="Sign In" @click="alertLoginData"></f7-list-button>
            <f7-block-footer>
              Some text about login information.<br>Click "Sign In" to close Login Screen
            </f7-block-footer>
          </f7-list>
        </f7-page>
      </f7-view>
    </f7-login-screen>
  </f7-app>
</template>
<script>
  import { ref, onMounted } from 'vue';
  import { f7, f7ready } from 'framework7-vue';


  import routes from '../js/routes.js';
  import store from '../js/store';
  import SideMenu from '../pages/sidenav.vue'
  import { initBridge } from '../js/hydra.js';


  export default {
    data() {
      return {
        number:0
      }
    },
    components: {
      SideMenu,
    },
    methods: {
          refreshMenu() {
            this.number++;
          }
        },
    setup() {
      // Framework7 Parameters
      const f7params = {
        name: 'My App', // App name
        theme: 'auto', // Automatic theme detection
        view: {
            browserHistory: true,
            browserHistoryOnLoad: true,
            browserHistoryStoreHistory: false,
            browserHistoryInitialMatch: false,
            preloadPreviousPage: false
            //browserHistorySeperator: "#!",
            //cache: false,
            //reloadPages: true,
            //reloadDetail: true
        },

        // App store
        store: store,
        // App routes
        routes: routes,
      };
      // Login screen data
      const username = ref('');
      const password = ref('');

      const alertLoginData = () => {
        f7.dialog.alert('Username: ' + username.value + '<br>Password: ' + password.value, () => {
          f7.loginScreen.close();
        });
      }

      // In Layout.js or App.js
      const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video', 'gridBlock', 'teaser']});

      onMounted(() => {
        f7ready((f7) => {
          window.addEventListener("hashchange", () => {
              const url = new URL(window.location);
              const path = url.href.split("#!")[1];
              f7.views.main.router.navigate(path);
            });

          bridge.onEditChange((data) => {
            // f7.views.main.router.navigate(f7.views.main.router.currentRoute.url, {
            //   reloadCurrent: true,
            //   ignoreCache: true,
            //   options: {
            //     props: {
            //       data: data
            //     }
            //   }
            // });
            f7.store.state.content = data;
        
           });

          // Call F7 APIs here
        });
      });
      const panelComponent = null;
      const panelProps = {navigation:[]};
      var number =0;
      return {
        f7params,
        username,
        password,
        alertLoginData,
        panelComponent,
        panelProps
      }
    }
  }
</script>../js/store.js