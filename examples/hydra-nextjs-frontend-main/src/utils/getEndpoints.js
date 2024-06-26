export function getEndpoint(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  const parts = path.split("/");
  return parts[parts.length - 1];
}
