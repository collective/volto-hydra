export default function extractEndpoints(url) {
  const baseUrl = "https://hydra.pretagov.com/";
  return url.replace(baseUrl, "");
}
