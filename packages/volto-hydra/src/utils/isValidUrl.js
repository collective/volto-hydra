/**
 * Check if the URL is valid
 * @param {URL} string
 * @returns bool
 */
export default function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
