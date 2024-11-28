import mkcert from 'vite-plugin-mkcert'

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
    },
  },
  modules: [
    '@nuxtjs/tailwindcss', 
    'nuxt-security', 
    '@nuxt/image'
  ],
  ssr: true, // "npm run generate" == SSG
  routeRules: {
    "/**": { cors: true } // public site can't be edited
  },
  $env: {
    edit: {
      ssr: false, // "npm run generate -- --envName edit" == SPA
      routeRules: {
        "/**": {
          cors: true,
          security: {
            headers: { // Edit site can be put in an iframe
              contentSecurityPolicy: {
                'img-src': ["'self'", "data:", 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com'],
                'connect-src': ["'self'", "data:", 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com'],
                'frame-ancestors': ['*']
              },
              crossOriginResourcePolicy: "cross-origin",
              xFrameOptions: false
            }
          }
        }
      },
      runtimeConfig: {
        public: {
          image_alias: ''
        }
      },
      image: {
        provider: 'netlify',
      }        
      // generate: {
      //   fallback: "index.html", // Uses '404.html' instead of the default '200.html'
      // },
    }
  },
  runtimeConfig: {
    public: {
      image_alias: '_plone_' // needed so we don't use image alias when no SSR
    }
  },
  css: ['/assets/css/main.css'],
  devtools: { enabled: true },
  // postcss: {
  //   plugins: {
  //     tailwindcss: {},
  //     autoprefixer: {},
  //   },
  // },
  image: {
    provider: 'ipx',
    domains: ['hydra-api.pretagov.com','hydra.pretagov.com'],
    alias: {
      '_plone_': "https://hydra-api.pretagov.com"
    }
  },
  experimental: {
      payloadExtraction: false
  },

  // How to prerender dynamic routes?
  // generate routes -  https://medium.com/js-dojo/how-i-generated-dynamic-routes-for-different-nuxt-js-pages-ce2ee6972743
  // crawlpages (allows some dynamic to still work) - https://stackoverflow.com/questions/77292506/how-to-make-nuxt-3-correctly-build-ssg-pages-dynamic-api-routes

  router: {
      options: {
          strict: false
      }
  },
  vite: {
    plugins: [
      mkcert({
        savePath: './certs', // save the generated certificate into certs directory
        force: true, // force generation of certs even without setting https property in the vite config
      }),  
    ],
  
        /* options for vite */
    // ssr: true // enable unstable server-side rendering for development (false by default)
    // experimentWarning: false // hide experimental warning message (disabled by default for tests)
    vue: {
      /* options for vite-plugin-vue2 */
    },
  },
  devServer: {
    https: {
      cert: './certs/cert.pem',
      key: './certs/dev.pem'
    }
  },
  sourcemap: {
    server: true,
    client: true
  },
  compatibilityDate: '2024-11-20'
});