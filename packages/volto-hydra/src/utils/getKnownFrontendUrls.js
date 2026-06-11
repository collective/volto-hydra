import getSavedURLs from './getSavedURLs';

/**
 * Return every absolute URL prefix that the user has registered as a
 * "frontend" — both edit-mode URLs (`url`) and the optional published
 * URLs (`publishUrl`). De-duplicated, no trailing slashes.
 *
 * Used by the @plone/volto/helpers/Url shadow to recognise pasted links
 * from any frontend the editor knows about and flatten them to /paths.
 * Volto's stock helpers only know about `settings.apiPath` /
 * `internalApiPath` / `publicURL`, none of which match an iframe
 * frontend's published origin.
 *
 * @returns {string[]} List of origin URLs without trailing slashes.
 */
const getKnownFrontendUrls = () => {
  const seen = new Set();
  for (const e of getSavedURLs()) {
    if (e.url) seen.add(e.url.replace(/\/$/, ''));
    if (e.publishUrl) seen.add(e.publishUrl.replace(/\/$/, ''));
  }
  return [...seen];
};

export default getKnownFrontendUrls;
