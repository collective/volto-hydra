# Volto Hydra (volto-hydra)

A volto addon to let you edit content in realtime when you have many frontends written in any framework.

## Connecting Your Frontend with Volto-Hydra AdminUI

This guide will help you set up Volto-Hydra (AdminUI) and connect your frontend to it. The process is divided into two main steps:

1. Setting up Volto-Hydra (AdminUI)
2. Setting up your frontend to connect with Volto-Hydra

### Step 1: Setting Up Volto-Hydra (AdminUI) 

**1. Clone the Volto-Hydra Repository**

- Clone the Volto-Hydra repository from GitHub:

    ```bash
    git clone https://github.com/collective/volto-hydra.git
    cd volto-hydra
    ```
**2. Start Volto-Hydra**

- Run the following command to start the Volto-Hydra site:
    ```bash
    make start
    ```
- Ensure Volto is running on port 3000.

**3. Start the Plone Backend**

- You can start the Plone backend using Docker images, or you can navigate to the core/api directory in Volto-Hydra and run:
    ```bash
    cd core/api
    make start
    ```

### Step 2: Setting Up Your Frontend

**1. Choose Your Framework**

- You can use any frontend framework (e.g., React, Next.js, Vue.js).
- Fetch content from the Plone backend using the [@plone/client](https://github.com/plone/volto/tree/main/packages/client) library or the simple Fetch API.

**2. Connect Frontend to AdminUI**

- To connect your frontend with the AdminUI, add the following code snippet in your `<script>` tag to load our iframeBridge:
    ```js
    window.navigation.addEventListener("navigate", (event) => {
      parent.postMessage({type: 'URL_CHANGE', url: event.destination.url}, 'http://localhost:3000');
  })
    ```
**3. Configure CORS**

- Ensure your frontend runs on port 3002. If you need to use a different port, update the port number in [here](https://github.com/collective/volto-hydra/blob/a77a0f3806229b1b419740a43ffc5d711724b294/packages/volto-hydra/src/components/Iframe/View.jsx#L8-L25) to avoid CORS errors.

**4. Example Frontend**

- To get hands-on experience, you can use this [Next.js frontend example](https://github.com/MAX-786/hydra-nextjs-frontend).

By following these steps, you will have Volto-Hydra (AdminUI) running and your frontend connected to it, allowing you to preview your frontend in AdminUI. 