import mkcert from 'vite-plugin-mkcert'

export default defineNuxtConfig({
  buildModules: [
    '@nuxtjs/tailwindcss', 
    'nuxt-security', 
    '@aceforth/nuxt-netlify',
  ],
  modules: [
    '@nuxt/image'
  ],
  devtools: { enabled: true },
  css: ['/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  ssr: true,
  $env: {
    edit: {
      ssr: false
    }
  },
  security: {
    corsHandler: {
      // options
      origin: "https://hydra.pretagov.com"
    },
    headers: {
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com'],
        'connect-src': ["'self'", 'data:', 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com'],
        'frame-ancestors': ['*']
      },
      crossOriginResourcePolicy: "cross-origin",
    }
  },
  netlify: { 
    mergeSecurityHeaders: true,
    $env: {
      edit: {
        redirects: {
          from: "/*",
          to: "/index.html",
          status: 200
        }
      }
    }
  },
  static: true,
  image: {
    provider: 'ipx',
    domains: ['hydra-api.pretagov.com'],
    staticFilename: '[publicPath]/images/[name]-[hash][ext]',
    alias: {
      plone: "https://hydra-api.pretagov.com"
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
  sourcemap: true,
  compatibilityDate: '2024-11-20'
});