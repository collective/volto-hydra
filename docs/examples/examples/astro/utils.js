/**
 * Shared utilities for Astro doc example components.
 * Plain JS (no Astro syntax) — straight copy of svelte/utils.js so behavior
 * stays identical across the example frontends.
 */

/**
 * Convert a Plone image value to a full URL for use in <img src>.
 * Handles: string paths, objects with @id, catalog brains with image_scales.
 * Prepends the API origin for relative paths.
 */
export function getImageUrl(value) {
  if (!value) return '';
  const apiUrl = (typeof window !== 'undefined' && window._API_URL) || '';

  // Catalog brain with image_scales
  if (value.image_scales && value.image_field) {
    const field = value.image_field;
    const scales = value.image_scales[field];
    if (scales?.[0]?.download) {
      const baseUrl = value['@id'] || '';
      const prefix = baseUrl.startsWith('http') ? '' : apiUrl;
      return `${prefix}${baseUrl}/${scales[0].download}`;
    }
  }

  // No image data (catalog brain without image_scales) — return empty
  if (value.image_scales === null || value.image_field === '') return '';

  // Extract URL from various formats
  let url = Array.isArray(value) ? value[0]?.['@id'] : value?.['@id'] || value;
  if (typeof url !== 'string') return '';

  // Add @@images/image for content paths without a scale URL
  if (url.startsWith('/') && !url.includes('@@images') && !url.includes('@@download')) {
    url = `${url}/@@images/image`;
  }

  // Prepend API origin for relative paths
  if (url.startsWith('/')) {
    url = `${apiUrl}${url}`;
  }

  return url;
}

/**
 * Tiny binding helpers that defer to window globals set by main.js. Using a
 * function makes the call site (`contentPath(x)`) read the same as the svelte
 * version, while the actual implementation is provided at runtime.
 *
 * On the server (where the render endpoint runs in node, no window) these
 * return safe fallbacks so SSR doesn't blow up — the per-block rendered HTML
 * is still meaningful for tests that only check element shape.
 */
export function contentPath(url) {
  if (typeof window !== 'undefined' && window._contentPath) return window._contentPath(url);
  return url || '';
}

export function apiUrl() {
  if (typeof window !== 'undefined' && window._API_URL) return window._API_URL;
  return '';
}
