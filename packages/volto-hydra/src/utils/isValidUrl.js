export default function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
