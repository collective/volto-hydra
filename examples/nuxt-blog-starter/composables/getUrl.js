export default function getUrl(href) {
    if (href === undefined) {
      return "#"
    }
    if (!href) {
      return "#"
    }
    if (href?.Length) {
      href = href[0]
    }
    href = href?.value ? href?.value : href;
    if (typeof href === 'string') {
      return href;
    }
    else if ("url" in href) {
      return href.url;
    }
    else if ('@id' in href) {
        if (href['@id'].startsWith("http")) {
          const url = new URL(href['@id']);
          return url.pathname;
        }
        return href['@id'];
    }
    return href

};