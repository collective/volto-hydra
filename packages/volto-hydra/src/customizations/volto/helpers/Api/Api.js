/**
 * Api helper.
 * @module helpers/Api
 *
 * VOLTO-HYDRA SHADOW.
 * Byte-identical to the stock @plone/volto Api helper EXCEPT for the bridge
 * branch at the top of the constructor. Copied rather than wrapped because
 * Volto's customization aliasing rewrites `@plone/volto/helpers/Api/Api` for
 * every importer including this file, so importing the original by its package
 * specifier would resolve back here. That is the standard Volto customization
 * idiom and matches the sibling Url shadow.
 *
 * The Hydra additions are tagged with `HYDRA:` comments to keep
 * upstream-rebase diffing trivial.
 */

import superagent from 'superagent';
import Cookies from 'universal-cookie';
import config from '@plone/volto/registry';
import { addHeadersFactory } from '@plone/volto/helpers/Proxy/Proxy';
import {
  stripQuerystring,
  stripSubpathPrefix,
} from '@plone/volto/helpers/Url/Url';
// HYDRA: bridge transport, used instead of superagent inside a Hydra session.
import { BridgeApi } from '../../../../bridge/BridgeApi';

const methods = ['get', 'post', 'put', 'patch', 'del'];

/**
 * Format the url.
 * @function formatUrl
 * @param {string} path Path (or URL) to be formatted.
 * @returns {string} Formatted path.
 */
export function formatUrl(path) {
  const { settings } = config;
  const apiSuffix = settings.legacyTraverse ? '' : '/++api++';

  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  let apiPath = '';
  if (settings.internalApiPath && __SERVER__) {
    apiPath = settings.internalApiPath;
  } else if (settings.apiPath) {
    apiPath = settings.apiPath;
  }

  const contentPath = stripSubpathPrefix(path[0] !== '/' ? `/${path}` : path);
  return `${apiPath}${apiSuffix}${contentPath}`;
}

/**
 * Api class.
 * @class Api
 */
class Api {
  /**
   * Constructor
   * @method constructor
   * @constructs Api
   */
  constructor(req) {
    // HYDRA: inside a Hydra bridge session every CMS call is answered by the
    // frontend's adapter, so the admin holds no credentials and issues no
    // direct request. Three conditions must ALL hold:
    //
    //   1. the feature is switched on
    //   2. we are on the client — SSR constructs `new Api(req)` with a request
    //      object, the client constructs `new Api()` without one, and there is
    //      no iframe at render time anyway
    //   3. the iframe view has mounted and published its RPC client
    //
    // Any of them failing falls through to the stock superagent path below, so
    // a half-configured or pre-handshake state degrades to today's behaviour
    // rather than breaking.
    if (
      config.settings.useBridgeBackend &&
      !req &&
      typeof window !== 'undefined' &&
      window.__hydraBridgeRpc
    ) {
      return new BridgeApi(window.__hydraBridgeRpc);
    }

    const cookies = new Cookies();

    methods.forEach((method) => {
      this[method] = (
        path,
        {
          params,
          data,
          type,
          headers = {},
          checkUrl = false,
          attach = [],
        } = {},
      ) => {
        let request;
        let promise = new Promise((resolve, reject) => {
          request = superagent[method](formatUrl(path));

          if (params) {
            request.query(params);
          }

          let authToken;
          if (req) {
            // We are in SSR
            authToken = req.universalCookies.get('auth_token');
            request.use(addHeadersFactory(req));
          } else {
            authToken = cookies.get('auth_token');
          }
          if (authToken) {
            request.set('Authorization', `Bearer ${authToken}`);
          }

          request.set('Accept', 'application/json');

          if (type) {
            request.type(type);
          }

          Object.keys(headers).forEach((key) => request.set(key, headers[key]));

          if (__SERVER__ && checkUrl && ['get', 'head'].includes(method)) {
            request.redirects(0);
          }

          if (data) {
            request.send(data);
          }

          attach.forEach((attachment) => {
            request.attach.apply(request, attachment);
          });

          request.end((err, response = {}) => {
            if (
              checkUrl &&
              request.url &&
              request.xhr &&
              encodeURI(stripQuerystring(request.url)) !==
                stripQuerystring(request.xhr.responseURL)
            ) {
              if (request.xhr.responseURL?.length === 0) {
                return reject({
                  code: 408,
                  status: 408,
                  url: request.xhr.responseURL,
                });
              }
              return reject({
                code: 301,
                url: request.xhr.responseURL,
              });
            }

            if ([301, 302].includes(err?.status)) {
              return reject({
                code: err.status,
                url: err.response?.headers?.location,
              });
            }

            return err ? reject(err) : resolve(response.body || response.text);
          });
        });
        promise.request = request;
        return promise;
      };
    });
  }
}

export default Api;
