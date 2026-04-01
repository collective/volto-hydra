# Advanced

Advanced topics for optimising your Hydra integration: lazy loading the bridge, authentication, and preventing reloads.

## Lazy Load the Bridge

Detect the admin iframe and load the bridge only when needed. `window.name` is set by Hydra to indicate mode:

- **`hydra-edit:<origin>`** — edit mode (e.g., `hydra-edit:http://localhost:3001`)
- **`hydra-view:<origin>`** — view mode (e.g., `hydra-view:http://localhost:3001`)

This persists across SPA navigation within the iframe, allowing your frontend to detect it's in the admin even after client-side route changes. In view mode, render from your API immediately but still load the bridge for navigation tracking. In edit mode, wait for `onEditChange` before rendering.

<!-- codeExample: javascript -->
```javascript
function loadBridge(callback) {
    const existingScript = document.getElementById("hydraBridge");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "your-hydra-js-path";
      script.id = "hydraBridge";
      document.body.appendChild(script);
      script.onload = () => callback();
    } else {
      callback();
    }
}

const isHydraEdit = window.name.startsWith('hydra-edit:');
const isHydraView = window.name.startsWith('hydra-view:');
const inAdminIframe = isHydraEdit || isHydraView;

// View mode or not in admin: render from API
if (!isHydraEdit) {
    renderPage(await fetchContent(path));
}

// Load bridge only in admin iframe
if (inAdminIframe) {
    loadBridge(() => {
        initBridge({
            onEditChange: (formData) => renderPage(formData),
        });
    });
}
```

## Authentication

As soon as the editor logs into the hydra editor, your frontend should use the same auth token to access the REST API with the same privileges and render private content.

The `access_token` is passed as a URL parameter on initial load and automatically stored in `sessionStorage` by hydra.js. On SPA navigation, the URL param is gone but the token persists in `sessionStorage`. Use the `getAccessToken()` helper:

<!-- codeExample: javascript -->
```javascript
import { getAccessToken } from '@hydra-js/hydra.js';

const token = getAccessToken();
// Returns token from URL param (if present)
// or sessionStorage (for SPA navigation)
```

Example using Next.js 14 and ploneClient:

<!-- codeExample: javascript -->
```javascript
import ploneClient from "@plone/client";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from '@hydra-js/hydra.js';

export default function Blog({ params }) {
  const token = getAccessToken();

  const client = ploneClient.initialize({
    apiPath: "http://localhost:8080/Plone/",
    token: token,
  });

  const { getContentQuery } = client;
  const { data, isLoading } = useQuery(
    getContentQuery({ path: '/blogs' })
  );

  if (isLoading) return <div>Loading...</div>;
  return <div>{data.title}</div>;
}
```

## Preventing Reloads

If you wish to make the editing experience smoother you can register for `onRoute` callbacks to prevent the frontend being forced to reload at certain times using the hydra editor. (TODO)
