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
    this.clickOnBtn = false;
    this.quantaToolbar = null;
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
      const isEditMode = url.searchParams.get('_edit') === 'true';
      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.setupMessageListener();
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
        this.selectBlock(blockElement);
      }
    };

    document.removeEventListener('click', this.blockClickHandler);
    document.addEventListener('click', this.blockClickHandler);
  }

  selectBlock(blockElement) {
    // Remove border and button from the previously selected block
    if (this.currentlySelectedBlock) {
      this.currentlySelectedBlock.classList.remove('volto-hydra--outline');
      if (this.addButton) {
        this.addButton.remove();
        this.addButton = null;
      }
      if (this.deleteButton) {
        this.deleteButton.remove();
        this.deleteButton = null;
      }
      if (this.quantaToolbar) {
        this.quantaToolbar.remove();
        this.quantaToolbar = null;
      }
    }

    // Set the currently selected block
    this.currentlySelectedBlock = blockElement;
    // Add border to the currently selected block
    this.currentlySelectedBlock.classList.add('volto-hydra--outline');
    const blockUid = blockElement.getAttribute('data-block-uid');

    // Create and append the Add button
    this.addButton = document.createElement('button');
    this.addButton.className = 'volto-hydra-add-button';
    this.addButton.innerHTML = addSVG;
    this.addButton.onclick = () => {
      this.clickOnBtn = true;
      window.parent.postMessage(
        { type: 'ADD_BLOCK', uid: blockUid },
        this.adminOrigin,
      );
    };
    this.currentlySelectedBlock.appendChild(this.addButton);

    // Create the quantaToolbar
    this.quantaToolbar = document.createElement('div');
    this.quantaToolbar.className = 'volto-hydra-quantaToolbar';

    // Prevent event propagation for the quantaToolbar
    this.quantaToolbar.addEventListener('click', (e) => e.stopPropagation());

    // Create the drag button
    const dragButton = document.createElement('button');
    dragButton.className = 'volto-hydra-drag-button';
    dragButton.innerHTML = dragSVG; // Use your drag SVG here
    dragButton.disabled = true; // Disable drag button for now

    // Create the three-dot menu button
    const menuButton = document.createElement('button');
    menuButton.className = 'volto-hydra-menu-button';
    menuButton.innerHTML = threeDotsSVG; // Use your three dots SVG here

    // Create the dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'volto-hydra-dropdown-menu';

    // Create the 'Remove' option
    const removeOption = document.createElement('div');
    removeOption.className = 'volto-hydra-dropdown-item';
    removeOption.innerHTML = `${deleteSVG} <div class="volto-hydra-dropdown-text">Remove</div>`;
    removeOption.onclick = () => {
      this.clickOnBtn = true;
      window.parent.postMessage(
        { type: 'DELETE_BLOCK', uid: blockUid },
        this.adminOrigin,
      );
    };

    // Create the 'Settings' option
    const settingsOption = document.createElement('div');
    settingsOption.className = 'volto-hydra-dropdown-item';
    settingsOption.innerHTML = `${settingsSVG} <div class="volto-hydra-dropdown-text">Settings</div>`;
    // ---Add settings click handler here (currently does nothing)---

    // Create the divider
    const divider = document.createElement('div');
    divider.className = 'volto-hydra-divider';

    // Append options to the dropdown menu
    dropdownMenu.appendChild(settingsOption);
    dropdownMenu.appendChild(divider);
    dropdownMenu.appendChild(removeOption);

    // Add event listener to toggle dropdown visibility
    menuButton.addEventListener('click', () => {
      dropdownMenu.classList.toggle('visible');
    });

    // Append elements to the quantaToolbar
    this.quantaToolbar.appendChild(dragButton);
    this.quantaToolbar.appendChild(menuButton);
    this.quantaToolbar.appendChild(dropdownMenu);

    // Append the quantaToolbar to the currently selected block
    this.currentlySelectedBlock.appendChild(this.quantaToolbar);

    if (!this.clickOnBtn) {
      window.parent.postMessage(
        { type: 'OPEN_SETTINGS', uid: blockUid },
        this.adminOrigin,
      );
    } else {
      this.clickOnBtn = false;
    }
  }

  setupMessageListener() {
    this.messageHandler = (event) => {
      if (
        event.origin === this.adminOrigin &&
        event.data.type === 'SELECT_BLOCK'
      ) {
        const { uid } = event.data;
        this.observeForBlock(uid);
      }
    };

    window.removeEventListener('message', this.messageHandler);
    window.addEventListener('message', this.messageHandler);
  }

  observeForBlock(uid) {
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const blockElement = document.querySelector(
            `[data-block-uid="${uid}"]`,
          );
          if (blockElement) {
            this.selectBlock(blockElement);
            observer.disconnect();
            break;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
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
        border: 2px solid #2597F4;
        border-radius: 6px;
        pointer-events: none;
        z-index: 5;
      }
      .volto-hydra-add-button {
        position: absolute;
        background: none;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 8px;
        border-radius: 36px;
        background-color: var(--gray-snow, #f3f5f7);
        border: 2px solid rgb(37 151 244 / 50%);
      }
      .volto-hydra-add-button {
        bottom: -49px;
        right: 0;
        transform: translateX(-50%);
      }
      .volto-hydra-quantaToolbar {
        display: flex;
        align-items: center;
        position: absolute;
        background: white;
        box-shadow: 3px 3px 10px rgb(0 0 0 / 53%);
        border-radius: 6px;
        z-index: 10;
        top: -45px;
        left: 0;
        box-sizing: border-box;
        width: 70px;
      }
      .volto-hydra-drag-button,
      .volto-hydra-menu-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5em;
        margin: 0;
      }
      .volto-hydra-drag-button {
        cursor: default;
        background: #E4E8EC;
        border-radius: 6px;
        padding: 9px 6px;
      }
      .volto-hydra-dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        right: -200%;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 100;
        margin-top: -8px;
        width: 180px;
        box-sizing: border-box;
      }
      .volto-hydra-dropdown-menu.visible {
        display: block;
      }
      .volto-hydra-dropdown-item {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 10px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .volto-hydra-dropdown-item svg {
        margin-right: 1em;
      }
      .volto-hydra-dropdown-item:hover {
        background: #f0f0f0;
      }
      .volto-hydra-divider {
        height: 1px;
        background: rgba(0, 0, 0, 0.1);
        margin: 0 1em;
      }
    `;
    document.head.appendChild(style);
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
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
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
 * @param {*} callback - this will be called with the updated data
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

const deleteSVG = `<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const dragSVG = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="SVGRepo_bgCarrier" stroke-width="0"/>
<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
<g id="SVGRepo_iconCarrier"> <path d="M8 6.5C9.38071 6.5 10.5 5.38071 10.5 4C10.5 2.61929 9.38071 1.5 8 1.5C6.61929 1.5 5.5 2.61929 5.5 4C5.5 5.38071 6.61929 6.5 8 6.5Z" fill="#4A5B68"/> <path d="M15.5 6.5C16.8807 6.5 18 5.38071 18 4C18 2.61929 16.8807 1.5 15.5 1.5C14.1193 1.5 13 2.61929 13 4C13 5.38071 14.1193 6.5 15.5 6.5Z" fill="#4A5B68"/> <path d="M10.5 12C10.5 13.3807 9.38071 14.5 8 14.5C6.61929 14.5 5.5 13.3807 5.5 12C5.5 10.6193 6.61929 9.5 8 9.5C9.38071 9.5 10.5 10.6193 10.5 12Z" fill="#4A5B68"/> <path d="M15.5 14.5C16.8807 14.5 18 13.3807 18 12C18 10.6193 16.8807 9.5 15.5 9.5C14.1193 9.5 13 10.6193 13 12C13 13.3807 14.1193 14.5 15.5 14.5Z" fill="#4A5B68"/> <path d="M10.5 20C10.5 21.3807 9.38071 22.5 8 22.5C6.61929 22.5 5.5 21.3807 5.5 20C5.5 18.6193 6.61929 17.5 8 17.5C9.38071 17.5 10.5 18.6193 10.5 20Z" fill="#4A5B68"/> <path d="M15.5 22.5C16.8807 22.5 18 21.3807 18 20C18 18.6193 16.8807 17.5 15.5 17.5C14.1193 17.5 13 18.6193 13 20C13 21.3807 14.1193 22.5 15.5 22.5Z" fill="#4A5B68"/> </g>
</svg>`;
const addSVG = `<img widht="20px" height="20px" src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjgzMjggMi41MDAwMkg5LjE2NjE4VjkuMTY2NjhIMi40OTk1MVYxMC44MzMzSDkuMTY2MThWMTcuNUgxMC44MzI4VjEwLjgzMzNIMTcuNDk5NVY5LjE2NjY4SDEwLjgzMjhWMi41MDAwMloiIGZpbGw9IiM0QTVCNjgiLz4KPC9zdmc+Cg=='/>`;
const threeDotsSVG = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 10C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10Z" fill="#000000"/>
<path d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" fill="#000000"/>
<path d="M21 12C21 10.8954 20.1046 10 19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14C20.1046 14 21 13.1046 21 12Z" fill="#000000"/>
</svg>`;
const settingsSVG = `<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="3" stroke="#1C274C" stroke-width="1.5"/>
<path d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z" stroke="#1C274C" stroke-width="1.5"/>
</svg>`;
