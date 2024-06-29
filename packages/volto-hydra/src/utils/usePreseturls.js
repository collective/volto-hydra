import React, { useState, useEffect } from 'react';
import isValidUrl from './isValidUrl';

/**
 * Get the default URL(s) from the environment
 * @returns {Array} URL(s) from the environment
 */
const getPresetUrls = () => {
  const presetUrlsString =
    process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
    (typeof window !== 'undefined' &&
      window.env['RAZZLE_DEFAULT_IFRAME_URL']) ||
    'http://localhost:3002'; // fallback if env is not set

  const presetUrls = presetUrlsString.split(',');
  const validUrls = presetUrls?.filter(isValidUrl); // Filter out invalid URLs

  return validUrls;
};

const usePresetUrls = () => {
  const [urls, setUrls] = useState(['http://localhost:3002']);

  useEffect(() => {
    setUrls(getPresetUrls());
  }, []);

  return urls;
};

export default usePresetUrls;
