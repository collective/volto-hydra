/** Bridge class creating two-way link between the Hydra and the frontend **/
class Bridge {
  constructor(adminOrigin) {
    this.adminOrigin = adminOrigin;
    this.token = null;
    this.navigationHandler = null;
    this.realTimeDataHandler = null;
    this.blockClickHandler = null;
    this.currentlySelectedBlock = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.self !== window.top) {
      this.navigationHandler = (event) => {
        window.parent.postMessage(
          { type: 'URL_CHANGE', url: event.destination.url },
          this.adminOrigin,
        );
      };

      // Ensure we don't add multiple listeners
      window.navigation.removeEventListener('navigate', this.navigationHandler);
      window.navigation.addEventListener('navigate', this.navigationHandler);

      // Get the access token from the URL
      const url = new URL(window.location.href);
      const access_token = url.searchParams.get('access_token');
      const isEditMode = url.searchParams.get('_edit') === 'true'; // Only when in edit mode

      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      if (isEditMode) {
        this.enableBlockClickListener();
      }
    }
  }

  onEditChange(callback) {
    this.realTimeDataHandler = (event) => {
      if (event.origin === this.adminOrigin) {
        if (event.data.type === 'FORM') {
          if (event.data.data) {
            callback(event.data.data);
          } else {
            throw new Error('No form data has been sent from the adminUI');
          }
        }
      }
    };

    // Ensure we don't add multiple listeners
    window.removeEventListener('message', this.realTimeDataHandler);
    window.addEventListener('message', this.realTimeDataHandler);
  }

  _setTokenCookie(token) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours

    const url = new URL(window.location.href);
    const domain = url.hostname;
    document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/; domain=${domain};`;
  }

  /**
   * Enable the frontend to listen for clicks on blocks to open the settings
   */
  enableBlockClickListener() {
    this.blockClickHandler = (event) => {
      const blockElement = event.target.closest('[data-block-uid]');
      if (blockElement) {
        // Remove border and button from the previously selected block
        if (this.currentlySelectedBlock) {
          this.currentlySelectedBlock.classList.remove('volto-hydra--outline');
        }

        // Set the currently selected block
        this.currentlySelectedBlock = blockElement;
        // Add border to the currently selected block
        this.currentlySelectedBlock.classList.add('volto-hydra--outline');
        const blockUid = blockElement.getAttribute('data-block-uid');

        window.parent.postMessage(
          { type: 'OPEN_SETTINGS', uid: blockUid },
          this.adminOrigin,
        );
      }
    };

    // Ensure we don't add multiple listeners
    document.removeEventListener('click', this.blockClickHandler);
    document.addEventListener('click', this.blockClickHandler);
  }

  // Method to clean up all event listeners
  cleanup() {
    if (this.navigationHandler) {
      window.navigation.removeEventListener('navigate', this.navigationHandler);
    }
    if (this.realTimeDataHandler) {
      window.removeEventListener('message', this.realTimeDataHandler);
    }
    if (this.blockClickHandler) {
      document.removeEventListener('click', this.blockClickHandler);
    }
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
export function getTokenFromCookie() {
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

/**
 * Enable the frontend to listen for changes in the admin and call the callback with updated data
 * @param {*} callback
 */
export function onEditChange(callback) {
  if (bridgeInstance) {
    bridgeInstance.onEditChange(callback);
  }
}

// Make initBridge available globally
if (typeof window !== 'undefined') {
  window.initBridge = initBridge;
}
