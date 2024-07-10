export default function extractEndpoints(url) {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL + "/";
  return url.replace(baseUrl, "");
}
