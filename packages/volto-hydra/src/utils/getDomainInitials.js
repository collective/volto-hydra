export default function getDomainInitials(url) {
  try {
    const hostname = new URL(url).hostname;
    // Strip common prefixes
    const name = hostname.replace(/^(www\.)/, '');
    // Get the first part before any dot
    const domain = name.split('.')[0];

    // Split on hyphens
    const parts = domain.split('-').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    // Single word: first 2 chars
    return domain.slice(0, 2).toUpperCase();
  } catch {
    return '??';
  }
}
