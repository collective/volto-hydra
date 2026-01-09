/**
 * Get port-specific cookie names to avoid conflicts when multiple
 * Volto instances run on different ports (e.g., 3001, 3011).
 *
 * Cookies on localhost are shared across all ports, so we include
 * the port in the cookie name to isolate each instance's preferences.
 */

/**
 * Get the current Volto port from window.location
 * @returns {string} The port number or '3001' as default
 */
const getVoltoPort = () => {
  if (typeof window === 'undefined') return '3001';
  return window.location.port || '80';
};

/**
 * Get the port-specific cookie name for iframe_url
 * @returns {string} Cookie name like 'iframe_url_3011'
 */
export const getIframeUrlCookieName = () => {
  return `iframe_url_${getVoltoPort()}`;
};

/**
 * Get the port-specific cookie name for saved_urls
 * @returns {string} Cookie name like 'saved_urls_3011'
 */
export const getSavedUrlsCookieName = () => {
  return `saved_urls_${getVoltoPort()}`;
};
