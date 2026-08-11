import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const hydraJsPath = resolve(__dirname, '../../packages/hydra-js')
const helpersPath = resolve(__dirname, '../../packages/helpers')
const fixturesPath = resolve(__dirname, '../../tests-playwright/fixtures')

// Where the edit SPA talks to. The defaults reproduce the public demo
// deployment, so building with no env set behaves exactly as before.
//
// Read at BUILD time, not runtime: the edit build is a static SPA (nitro
// preset 'static'), so Nuxt's usual NUXT_PUBLIC_* runtime overrides can't
// reach it — these values are baked into the bundle.
const BACKEND_URL = process.env.NUXT_TEST_BACKEND || 'https://hydra-api.pretagov.com'
const ADMIN_URL =
  process.env.NUXT_ADMIN_URL ||
  (process.env.NUXT_TEST_BACKEND ? 'http://localhost:3001' : 'https://hydra.pretagov.com')

// The edit SPA loads images from the backend and calls both backend and admin,
// so the CSP allow-list is DERIVED from those two rather than hard-coded.
// Deriving it means pointing a deployment at a different backend cannot leave
// a stale allow-list silently blocking every request — which is what the
// previous hard-coded hydra.pretagov.com list did to any other deployment.
const EDIT_CSP_SOURCES = ["'self'", 'data:', BACKEND_URL, ADMIN_URL]

// @nuxt/image's `domains` takes bare hostnames, not URLs. Throws on a
// malformed value rather than silently producing an allow-list that blocks
// every image.
const hostOf = (url: string) => new URL(url).host
const BACKEND_HOST = hostOf(BACKEND_URL)
const ADMIN_HOST = hostOf(ADMIN_URL)

export default defineNuxtConfig({
  nitro: {
    preset: 'static',
    prerender: {
      // Deploy sets NUXT_PRERENDER_STRICT=1 (see scripts/netlify-build.sh): fail the build
      // on ANY prerender error — page OR IPX image route — and print the REAL error, rather
      // than silently shipping broken images. Off by default so a local dev build without a
      // fully-imported API/blobs can still complete despite IPX 500s.
      failOnError: process.env.NUXT_PRERENDER_STRICT === '1',
      requestTimeout: 30000, // 30s timeout for SSG fetch requests (default 10s)
      // Cap at 2 parallel routes. Nitro defaults to 1 (serial). The
      // deployed Plone API is a single small (512MB) auto-suspending
      // instance, so 2 keeps the build faster than serial without
      // overwhelming a cold instance.
      concurrency: 2,
    },
  },

  hooks: {
    // Tell the prerenderer which routes exist, by asking the API.
    //
    // Without this the SSG shipped THREE files: nitro crawls outward from '/',
    // and this site's header renders its navigation as <button> elements that
    // open JS panels — there is not a single <a href> to a content page for a
    // crawler to follow. So /docs and everything under it 404'd on the
    // published site while existing perfectly well in the API.
    //
    // Enumerating from @search is also just more honest than crawling: a page
    // that nothing happens to link to is still a page, and should still be
    // built.
    async 'nitro:config'(nitroConfig: any) {
      if (nitroConfig.dev) return
      // The edit build is a SPA — one shell serves every route, so prerendering
      // content routes there would be pointless work. netlify-build.sh sets
      // NUXT_EDIT_BASE_URL only for that pass.
      if (process.env.NUXT_EDIT_BASE_URL) return

      const res = await fetch(`${BACKEND_URL}/++api++/@search?b_size=9999`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        // Fail the build rather than silently shipping a three-page site.
        throw new Error(
          `Could not enumerate routes for prerender: ${BACKEND_URL} returned ${res.status}`,
        )
      }
      const { items = [] } = await res.json()
      const routes = items
        .map((i: any) => i['@id'].replace(BACKEND_URL, '').replace(/^\/\+\+api\+\+/, ''))
        .filter((p: string) => p.startsWith('/'))

      nitroConfig.prerender ||= {}
      nitroConfig.prerender.routes = [
        ...new Set([...(nitroConfig.prerender.routes || []), ...routes]),
      ]
      console.log(`[prerender] ${routes.length} routes from ${BACKEND_URL}`)
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
                'img-src': EDIT_CSP_SOURCES,
                'connect-src': EDIT_CSP_SOURCES,
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
          // Set NUXT_TEST_BACKEND / NUXT_ADMIN_URL at build time to point a
          // deployment elsewhere; the CSP above follows automatically.
          backendBaseUrl: BACKEND_URL,
          adminUrl: ADMIN_URL,
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
      backendBaseUrl: BACKEND_URL,
      adminUrl: ADMIN_URL,
    },
  },
  css: ['/assets/css/main.css'],
  // devtools off: when the frontend is embedded in the admin iframe (cross-origin),
  // Nuxt DevTools throws `SecurityError: ... __NUXT_DEVTOOLS_DISABLE__ ... cross-origin
  // frame` trying to read the parent window, which breaks iframe access in dev-mode
  // tests (dev:test). Not needed for this example/test fixture.
  devtools: { enabled: false },
  // postcss: {
  //   plugins: {
  //     tailwindcss: {},
  //     autoprefixer: {},
  //   },
  // },
  image: {
    provider: 'ipx',
    // Derived, not hard-coded: IPX refuses to fetch from a domain that isn't
    // listed, so a deployment pointed at another backend would silently lose
    // every image if this list still named only the demo hosts.
    domains: [BACKEND_HOST, ADMIN_HOST],
    alias: {
      '_plone_': BACKEND_URL
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
        // Always use workspace source — Vite/Nuxt bundles tabbable automatically
        '@hydra-js/hydra.js': resolve(hydraJsPath, 'hydra.src.js'),
        '@hydra-js/helpers': resolve(helpersPath, 'index.js'),
        '@hydra-js': hydraJsPath,
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