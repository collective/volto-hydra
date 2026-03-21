import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const hydraJsPath = resolve(__dirname, '../../packages/hydra-js')
const fixturesPath = resolve(__dirname, '../../tests-playwright/fixtures')

export default defineNuxtConfig({
  nitro: {
    preset: 'static',
    prerender: {
      failOnError: false, // IPX image routes may 500 during local build
    },
  },
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
  vue: {
    compilerOptions: {
      comments: true, // Preserve HTML comments for hydra comment syntax
    },
  },
  routeRules: {
    "/**": { cors: true } // public site can't be edited
  },
  $env: {
    edit: {
      ssr: false, // "npm run generate -- --envName edit" == SPA
      vue: {
        compilerOptions: {
          comments: true,  // Preserve HTML comments for hydra comment syntax
        },
      },
      app: {
        baseURL: process.env.NUXT_EDIT_BASE_URL || '/',
      },
      nitro: {
        preset: 'static'
      },
      routeRules: {
        "/**": {
          cors: true,
          security: {
            headers: { // Edit site can be put in an iframe
              contentSecurityPolicy: {
                'img-src': ["'self'", "data:", 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com', 'http://localhost:3001', 'http://localhost:8888'],
                'connect-src': ["'self'", "data:", 'https://hydra.pretagov.com', 'https://hydra-api.pretagov.com', 'http://localhost:3001', 'http://localhost:8888'],
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
          image_alias: '',
          // Override API URL for test builds (NUXT_TEST_BACKEND env var)
          backendBaseUrl: process.env.NUXT_TEST_BACKEND || 'https://hydra-api.pretagov.com',
          adminUrl: process.env.NUXT_TEST_BACKEND ? 'http://localhost:3001' : 'https://hydra.pretagov.com',
        }
      },
      image: {
        provider: 'none',
      }
    },
    test: {
      // Test environment: HTTP mode, points to mock API on localhost:8888
      ssr: false,
      vue: {
        compilerOptions: {
          comments: true,  // Preserve HTML comments for hydra comment syntax
        },
      },
      nitro: {
        preset: 'static'  // SPA with proper fallback routing (same as edit profile)
      },
      devtools: { enabled: false },
      devServer: {
        https: false  // Disable HTTPS for test mode
      },
      // Disable rate limiting for tests
      security: {
        rateLimiter: false
      },
      routeRules: {
        "/**": {
          cors: true,
          security: {
            headers: {
              contentSecurityPolicy: {
                'img-src': ["'self'", "data:", 'http://localhost:3001', 'http://localhost:8888', 'https://placehold.co'],
                'connect-src': ["'self'", "data:", 'http://localhost:3001', 'http://localhost:8888'],
                'frame-ancestors': ['*']
              },
              crossOriginResourcePolicy: "cross-origin",
              xFrameOptions: false
            },
            rateLimiter: false
          }
        }
      },
      runtimeConfig: {
        public: {
          image_alias: '',
          backendBaseUrl: 'http://localhost:8888',
          adminUrl: 'http://localhost:3001',
        }
      },
      image: {
        provider: 'ipx',
        domains: ['localhost'],
      }
    }
  },
  runtimeConfig: {
    public: {
      image_alias: '_plone_', // needed so we don't use image alias when no SSR
      backendBaseUrl: 'https://hydra-api.pretagov.com',
      adminUrl: 'https://hydra.pretagov.com',
    },
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
    // Force pre-bundle these deps at startup to avoid 504 timeouts in CI
    optimizeDeps: {
      include: ['flowbite', 'errx'],
    },
    server: {
      watch: {
        // Reduce file watchers - prevents EMFILE errors
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/.nuxt/**',
          '**/.output/**',
          '**/coverage/**',
          '**/test-results/**',
          '**/playwright-report/**',
          '**/*.log',
        ],
        usePolling: false,  // Use native fs events (more efficient)
      }
    },
    plugins: [
      // mkcert disabled - certs already generated manually
      // mkcert({
      //   savePath: './certs',
      //   force: false,
      //   mkcertPath: '/usr/local/bin/mkcert',
      // }),
    ],
    resolve: {
      alias: {
        // In dev mode, use workspace source for live reload
        // In production builds, prebuild script syncs a local copy to ./packages
        '@hydra-js': process.env.NODE_ENV === 'development' ? hydraJsPath : './packages',
        '@test-fixtures': fixturesPath
      }
    },
        /* options for vite */
    // ssr: true // enable unstable server-side rendering for development (false by default)
    // experimentWarning: false // hide experimental warning message (disabled by default for tests)
    vue: {
      template: {
        compilerOptions: {
          comments: true, // Preserve HTML comments for hydra comment syntax
        },
      },
    },
  },
  devServer: {
    // HTTPS disabled by default - use HTTP for local development
    // For HTTPS, generate certs with mkcert and uncomment:
    // https: {
    //   cert: './certs/cert.pem',
    //   key: './certs/dev.pem'
    // }
  },
  sourcemap: {
    server: true,
    client: true
  },
  compatibilityDate: '2024-11-20'
});