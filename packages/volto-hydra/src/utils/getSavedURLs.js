import Cookies from 'js-cookie';
import isValidUrl from './isValidUrl';

/**
 * Get the default URL(s) from the environment
 * @returns {Array} URL(s) from the environment or 'http://localhost:3002' as fallback
 */
export const getURlsFromEnv = () => {
  const presetUrlsString =
    process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
    (typeof window !== 'undefined' &&
      window.env['RAZZLE_DEFAULT_IFRAME_URL']) ||
    'http://localhost:3002'; // fallback if env is not set

  const presetUrls = presetUrlsString.split(',');
  return presetUrls;
};

/**
 * Get the saved URLs from the cookies
 * @returns {Array} Saved URLs
 */
const getSavedURLs = () => {
  const urls = Cookies.get('saved_urls')
    ? Cookies.get('saved_urls').split(',')
    : [];
  const savedUrls = [
    ...new Set([...urls, ...getURlsFromEnv()]), // Merge saved URLs with default URLs make sure they are unique
  ];
  return savedUrls.filter(isValidUrl);
};

export default getSavedURLs;
