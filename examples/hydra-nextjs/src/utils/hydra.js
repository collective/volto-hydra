/** Bridge class creating two-way link between the Hydra and the frontend **/
class Bridge {
  constructor(adminOrigin) {
    this.adminOrigin = adminOrigin;
    this.token = null;
    this.navigationHandler = null; // Handler for navigation events
    this.realTimeDataHandler = null; // Handler for message events
    this.blockClickHandler = null; // Handler for block click events
    this.currentlySelectedBlock = null;
    this.addButton = null;
    this.deleteButton = null;
    this.init();
  }

  init() {
    if (typeof window === "undefined") {
      return;
    }

    if (window.self !== window.top) {
      this.navigationHandler = (event) => {
        window.parent.postMessage(
          { type: "URL_CHANGE", url: event.destination.url },
          this.adminOrigin
        );
      };

      // Ensure we don't add multiple listeners
      window.navigation.removeEventListener("navigate", this.navigationHandler);
      window.navigation.addEventListener("navigate", this.navigationHandler);

      // Get the access token from the URL
      const url = new URL(window.location.href);
      const access_token = url.searchParams.get("access_token");
      const isEditMode = url.searchParams.get("_edit") === "true";
      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
      }
    }
  }

  onEditChange(callback) {
    this.realTimeDataHandler = (event) => {
      if (event.origin === this.adminOrigin) {
        if (event.data.type === "FORM") {
          if (event.data.data) {
            callback(event.data.data);
          } else {
            throw new Error("No form data has been sent from the adminUI");
          }
        }
      }
    };

    // Ensure we don't add multiple listeners
    window.removeEventListener("message", this.realTimeDataHandler);
    window.addEventListener("message", this.realTimeDataHandler);
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
    document.addEventListener("click", (event) => {
      const blockElement = event.target.closest("[data-block-uid]");
      if (blockElement) {
        // Remove border and button from the previously selected block
        if (this.currentlySelectedBlock) {
          this.currentlySelectedBlock.classList.remove("volto-hydra--outline");
          if (this.addButton) {
            this.addButton.remove();
            this.addButton = null;
          }
          if (this.deleteButton) {
            this.deleteButton.remove();
            this.deleteButton = null;
          }
        }

        // Set the currently selected block
        this.currentlySelectedBlock = blockElement;
        // Add border to the currently selected block
        this.currentlySelectedBlock.classList.add("volto-hydra--outline");
        const blockUid = blockElement.getAttribute("data-block-uid");

        // Create and append the Add button
        this.addButton = document.createElement("button");
        this.addButton.className = "volto-hydra-add-button";
        this.addButton.innerHTML = addSVG;
        this.addButton.onclick = () => {
          window.parent.postMessage(
            { type: "ADD_BLOCK", uid: blockUid },
            this.adminOrigin
          );
        };
        this.currentlySelectedBlock.appendChild(this.addButton);

        // Create and append the Delete button
        this.deleteButton = document.createElement("button");
        this.deleteButton.className = "volto-hydra-delete-button";
        this.deleteButton.innerHTML = deleteSVG;
        this.deleteButton.onclick = () => {
          window.parent.postMessage(
            { type: "DELETE_BLOCK", uid: blockUid },
            this.adminOrigin
          );
        };
        this.currentlySelectedBlock.appendChild(this.deleteButton);

        window.parent.postMessage(
          { type: "OPEN_SETTINGS", uid: blockUid },
          this.adminOrigin
        );
      }
    });
  }
  injectCSS() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      .volto-hydra--outline {
        position: relative !important;
      }
      .volto-hydra--outline:before {
        content: "";
        position: absolute;
        top: -1px;
        left: -1px;
        right: -1px;
        bottom: -1px;
        border: 1px solid black;
        pointer-events: none;
        z-index: 5;
      }
      .volto-hydra-add-button, .volto-hydra-delete-button {
        position: absolute;
        border: none;
        background: none;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        z-index: 10;
      }
      .volto-hydra-add-button svg, .volto-hydra-delete-button svg {
        width: 24px;
        height: 24px;
        color: rgb(130, 106, 106);
      }
      .volto-hydra-add-button {
        bottom: -26px;
        left: 50%;
        transform: translateX(-50%);
      }
      .volto-hydra-delete-button {
        top: 5px;
        right: -40px;
      }
    `;
    document.head.appendChild(style);
  }

  // Method to clean up all event listeners
  cleanup() {
    if (this.navigationHandler) {
      window.navigation.removeEventListener("navigate", this.navigationHandler);
    }
    if (this.realTimeDataHandler) {
      window.removeEventListener("message", this.realTimeDataHandler);
    }
    if (this.blockClickHandler) {
      document.removeEventListener("click", this.blockClickHandler);
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
  if (typeof document === "undefined") {
    return null;
  }
  const name = "auth_token=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");
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
if (typeof window !== "undefined") {
  window.initBridge = initBridge;
}

const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 100 100">
<path d="M 46 13 C 44.35503 13 43 14.35503 43 16 L 43 18 L 32.265625 18 C 30.510922 18 28.879517 18.922811 27.976562 20.427734 L 26.433594 23 L 23 23 C 20.802666 23 19 24.802666 19 27 C 19 29.197334 20.802666 31 23 31 L 24.074219 31 L 27.648438 77.458984 C 27.88773 80.575775 30.504529 83 33.630859 83 L 66.369141 83 C 69.495471 83 72.11227 80.575775 72.351562 77.458984 L 75.925781 31 L 77 31 C 79.197334 31 81 29.197334 81 27 C 81 24.802666 79.197334 23 77 23 L 73.566406 23 L 72.023438 20.427734 C 71.120481 18.922811 69.489078 18 67.734375 18 L 57 18 L 57 16 C 57 14.35503 55.64497 13 54 13 L 46 13 z M 46 15 L 54 15 C 54.56503 15 55 15.43497 55 16 L 55 18 L 45 18 L 45 16 C 45 15.43497 45.43497 15 46 15 z M 32.265625 20 L 43.832031 20 A 1.0001 1.0001 0 0 0 44.158203 20 L 55.832031 20 A 1.0001 1.0001 0 0 0 56.158203 20 L 67.734375 20 C 68.789672 20 69.763595 20.551955 70.306641 21.457031 L 71.833984 24 L 68.5 24 A 0.50005 0.50005 0 1 0 68.5 25 L 73.5 25 L 77 25 C 78.116666 25 79 25.883334 79 27 C 79 28.116666 78.116666 29 77 29 L 23 29 C 21.883334 29 21 28.116666 21 27 C 21 25.883334 21.883334 25 23 25 L 27 25 L 61.5 25 A 0.50005 0.50005 0 1 0 61.5 24 L 28.166016 24 L 29.693359 21.457031 C 30.236405 20.551955 31.210328 20 32.265625 20 z M 64.5 24 A 0.50005 0.50005 0 1 0 64.5 25 L 66.5 25 A 0.50005 0.50005 0 1 0 66.5 24 L 64.5 24 z M 26.078125 31 L 73.921875 31 L 70.357422 77.306641 C 70.196715 79.39985 68.46881 81 66.369141 81 L 33.630859 81 C 31.53119 81 29.803285 79.39985 29.642578 77.306641 L 26.078125 31 z M 38 35 C 36.348906 35 35 36.348906 35 38 L 35 73 C 35 74.651094 36.348906 76 38 76 C 39.651094 76 41 74.651094 41 73 L 41 38 C 41 36.348906 39.651094 35 38 35 z M 50 35 C 48.348906 35 47 36.348906 47 38 L 47 73 C 47 74.651094 48.348906 76 50 76 C 51.651094 76 53 74.651094 53 73 L 53 69.5 A 0.50005 0.50005 0 1 0 52 69.5 L 52 73 C 52 74.110906 51.110906 75 50 75 C 48.889094 75 48 74.110906 48 73 L 48 38 C 48 36.889094 48.889094 36 50 36 C 51.110906 36 52 36.889094 52 38 L 52 63.5 A 0.50005 0.50005 0 1 0 53 63.5 L 53 38 C 53 36.348906 51.651094 35 50 35 z M 62 35 C 60.348906 35 59 36.348906 59 38 L 59 39.5 A 0.50005 0.50005 0 1 0 60 39.5 L 60 38 C 60 36.889094 60.889094 36 62 36 C 63.110906 36 64 36.889094 64 38 L 64 73 C 64 74.110906 63.110906 75 62 75 C 60.889094 75 60 74.110906 60 73 L 60 47.5 A 0.50005 0.50005 0 1 0 59 47.5 L 59 73 C 59 74.651094 60.348906 76 62 76 C 63.651094 76 65 74.651094 65 73 L 65 38 C 65 36.348906 63.651094 35 62 35 z M 38 36 C 39.110906 36 40 36.889094 40 38 L 40 73 C 40 74.110906 39.110906 75 38 75 C 36.889094 75 36 74.110906 36 73 L 36 38 C 36 36.889094 36.889094 36 38 36 z M 59.492188 41.992188 A 0.50005 0.50005 0 0 0 59 42.5 L 59 44.5 A 0.50005 0.50005 0 1 0 60 44.5 L 60 42.5 A 0.50005 0.50005 0 0 0 59.492188 41.992188 z"></path>
</svg>`;
const addSVG = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 24 24">
<path d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 7 L 11 11 L 7 11 L 7 13 L 11 13 L 11 17 L 13 17 L 13 13 L 17 13 L 17 11 L 13 11 L 13 7 L 11 7 z"></path>
</svg>`;