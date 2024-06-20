/** Bridge class creating two-way link between the Hydra and the frontend **/
class Bridge {
  constructor(adminOrigin) {
    this.adminOrigin = adminOrigin;
    this.token = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.self !== window.top) {
      window.navigation.addEventListener('navigate', (event) => {
        window.parent.postMessage(
          { type: 'URL_CHANGE', url: event.destination.url },
          this.adminOrigin,
        );
      });
    }

    window.addEventListener('message', (event) => {
      if (event.origin === this.adminOrigin) {
        if (event.data.type === 'GET_TOKEN_RESPONSE') {
          this.token = event.data.token;
          this._setTokenCookie(event.data.token);
        }
      }
    });
    this.enableBlockClickListener();
  }
  onEditChange(initialData, callback) {
    window.addEventListener('message', (event) => {
      if (event.origin === this.adminOrigin) {
        if (event.data.type === 'FORM') {
          if (event.data.data) {
            callback(event.data.data);
          } else {
            callback(initialData);
          }
        }
      }
    });
  }
  async get_token() {
    if (this.token !== null) {
      return this.token;
    }
    const cookieToken = this._getTokenFromCookie();
    if (cookieToken) {
      this.token = cookieToken;
      return cookieToken;
    }

    if (window.self !== window.top) {
      try {
        window.parent.postMessage({ type: 'GET_TOKEN' }, this.adminOrigin);
        const token = await this._waitForToken(this.adminOrigin);
        return token;
      } catch (error) {
        console.error('Failed to retrieve auth_token:', error);
        return null;
      }
    } else {
      return null;
    }
  }

  _waitForToken(adminOrigin) {
    return new Promise((resolve, reject) => {
      const tokenListener = (event) => {
        if (adminOrigin === this.adminOrigin) {
          if (event.data.type === 'GET_TOKEN_RESPONSE') {
            window.removeEventListener('message', tokenListener);
            this._setTokenCookie(event.data.token);
            resolve(event.data.token);
          } else {
            reject(
              new Error(
                `Invalid message type: Expected GET_TOKEN_RESPONSE, received ${event.data.type}`,
              ),
            );
          }
        } else {
          reject(
            new Error(
              `Origin mismatch: Expected ${this.adminOrigin}, received ${adminOrigin}`,
            ),
          );
        }
      };
      window.addEventListener('message', tokenListener);
    });
  }

  _setTokenCookie(token) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours
    document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/`;
  }

  _getTokenFromCookie() {
    if (typeof document === 'undefined') {
      return null;
    }
    const name = 'auth_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i].trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }
    return null;
  }
  enableBlockClickListener() {
    document.addEventListener('click', (event) => {
      const blockElement = event.target.closest('[data-block-uid]');
      if (blockElement) {
        const blockUid = blockElement.getAttribute('data-block-uid');
        window.parent.postMessage(
          { type: 'OPEN_SETTINGS', uid: blockUid },
          this.adminOrigin,
        );
      }
    });
  }
}

// Export an instance of the Bridge class
let bridgeInstance = null;

/**
 * Initialize the bridge
 *
 * @param {*} adminOrigin
 * @returns new Bridge()
 */
export function initBridge(adminOrigin) {
  if (!bridgeInstance) {
    bridgeInstance = new Bridge(adminOrigin);
  }
  return bridgeInstance;
}

/**
 * Get the token from the admin
 * @returns string
 */
export async function getToken() {
  if (bridgeInstance) {
    return await bridgeInstance.get_token();
  }
  return '';
}
/**
 * Enable the frontend to listen for changes in the admin and call the callback with updated data
 * @param {*} initialData
 * @param {*} callback
 */
export function onEditChange(initialData, callback) {
  if (bridgeInstance) {
    bridgeInstance.onEditChange(initialData, callback);
  }
}

export function enableBlockClickListener() {
  if (bridgeInstance) {
    bridgeInstance.enableBlockClickListener();
  }
}
