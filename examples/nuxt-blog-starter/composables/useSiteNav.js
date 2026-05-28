import { getAccessToken } from '@hydra-js/hydra.js';

// Fetch the site-wide navigation once and cache it across the whole
// Nuxt app via useState (survives page navigations and SSR/CSR hop).
//
// Why this exists: in edit mode the page document comes from the
// bridge (via onEditChange), not the REST API — see the "Realtime
// preview" row in docs/architecture.md. So we can't keep piggy-backing
// navigation on the per-page ploneApi fetch; the page fetch is gone
// in edit mode. Nav is a site-level concern, doesn't change per page,
// safe to fetch once.
export default async function useSiteNav() {
  const nav = useState('hydra-site-nav', () => null);
  if (nav.value) return nav;

  const runtimeConfig = useRuntimeConfig();
  const route = useRoute();
  const headers = { Accept: 'application/json' };
  const token = route.query.access_token || getAccessToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const url = `${runtimeConfig.public.backendBaseUrl}/++api++/?expand=navigation&expand.navigation.depth=2`;
  const data = await $fetch(url, { headers });
  nav.value = data?.['@components']?.navigation?.items || [];
  return nav;
}
