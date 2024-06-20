# Volto Hydra (volto-hydra)

A volto addon to turn Plone Volto into a decoupled editor for headless Plone.

Why Hydra? because it lets you have many frontends (heads) written in many framework all connected to the same body (plone) while still letting 
you edit the content directly into your frontend. 

It is a GSoC project to prove with the following goals
- Provide an editing UI as similar to Volto as possible (with some Quanta design ideas)
- Do so with the simplest integrator instructions possible

It's Volto without having to learn any Volto.

## Want to try the editor?

You can try out the editing experience now by logging into https://hydra.pretagov.com and pasting in the url of one of the available 
frontends already deployed for this demo site.

The first frontend you can test with is ... TODO

Note: not everything works yet. Follow the progress on the [Hydra Roadmap](https://github.com/orgs/collective/projects/3/views/4)
or the [Hydra README](https://github.com/collective/volto-hydra)


## Want to help? Make your own frontend

You can build your own frontend in your favourite frontend framework, deploy it and then [submit a ticket to have it listed as
one of the test frontends](https://github.com/collective/volto-hydra/issues).


### Choose Your Framework

- You can use any frontend framework (e.g., React, Next.js, Vue.js).
- Fetch content from the Plone backend using the [@plone/client](https://github.com/plone/volto/tree/main/packages/client) 
  library or the simple Fetch API.
- You can start small without dynamic menus or complex blocks and work up to supporting more kinds of blocks as you go.

TODO: link to more documentation on creating a frontend using @plone/client

### Test your frontend

You can either run a local hydra instance (see below) or connect it directly to https://hydra.pretagov.com/++api++

If you are testing against https://hydra.pretagov.com/++api++ you will need to ensure you are running on https locally via a proxy to ensure there
are no CORS errors

To test against a local hydra instance

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

### Make your frontend editable

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/hydra.js) and include it in your frontend
- Your frontend will know to initialise the hydra iframe bridge when it is being edited using hydra as it will recieve a ```?_edit=true```, [checkout below](#asynchronously-load-the-bridge) to load `hydra.js` asynchronously.
- Initialising hydra iframe bridge creates a two way link between the hydra editor and your frontend. You will be able to optionally register call backs 
  for events allowing you to add more advanced editor functionality depending on your needs.

### Authenticate frontend to access private content

- When you input your frontend URL at the Volto Hydra (adminUI) it will set 2 params in your frontend URL.
- You can extract the `access_token` parameter directly from the URL for the `ploneClient` token option. 
- Or you can use it in Authorization header if you are using other methods to fetch content from plone Backend.

Example Usage:
```js
// nextjs 14 using ploneClient
import ploneClient from "@plone/client";
import { useQuery } from "@tanstack/react-query";

export default function Blog({ params }) {
  // Extract token directly from the URL
  const url = new URL(window.location.href);
  const token = url.searchParams.get("access_token");
  
  const client = ploneClient.initialize({
    apiPath: "http://localhost:8080/Plone/", // Plone backend
    token: token,
  });

  const { getContentQuery } = client;
  const { data, isLoading } = useQuery(getContentQuery({ path: '/blogs' }));

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <div> {data.title}</div>
  )
}
```

Reference Issue: [#6](https://github.com/collective/volto-hydra/issues/6)

Now your editors login to hydra and navigate the site within the editor or via the frontend displayed in the middle of the screen. They can add, remove objects and do normal plone toolbar functions as well as edit a page metadata via the sidebar.

### How to initialise the bridge.

- Import `initBridge` from [hydra.js](https://github.com/collective/volto-hydra/tree/hydra.js).
- Call the `initBridge` and pass the origin of your adminUI as the argument to the initBridge method.
- For example, if you are trying out demo editor, it will be: `https://hydra.pretagov.com`
  ```js
  // In Layout.js or App.js
  import { initBridge } from './hydra.js';
  initBridge("https://hydra.pretagov.com");
  ```
- This will enable the 2 way link between hydra and your frontend.
- Log into https://hydra.pretagov.com/ and paste in your local running frontend to test.

TODO: more integrations will be added below as the [Hydra GSoC project progresses](https://github.com/orgs/collective/projects/3/views/4)

### Asynchronously Load the Bridge

Since the script has a considerable size, it’s recommended to load the bridge only when necessary, such as in edit mode.
To load the bridge asynchronously, add a function that checks if the bridge is already present. If it isn't, the function will load it and then call a callback function. This ensures the bridge is loaded only when needed.

```js
function loadBridge(callback) {
  const existingScript = document.getElementById("hydraBridge");
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "./hydra.js";
    script.id = "hydraBridge";
    document.body.appendChild(script);
    script.onload = () => {
      callback();
    };
  } else {
    callback();
  }
}

// Initialize the bridge only inside the admin UI
if (window.location.search.includes('_edit=true')) {
  loadBridge(() => {
    const { initBridge } = window;
    initBridge('https://hydra.pretagov.com');
  });
}
```

#### Show changes after save

This is the most basic form of integration. For this no additional integraion is needed. 

If you wish to make the editing experience faster you can register for ```onSave``` and ```onRoute``` callbacks to prevent reloads of the frontend (TODO)

#### Enable Show changes while editing

You will need to subscribe to an ```onEditChange``` event that will send blocks or metadata changes

TODO: not implemented yet. 

#### Enable Managing Blocks directly on your frontend

You will add data attributes to your rendered block html so hydra knows where they are on the page and it
will automatically handle click events and show a quanta toolbar when selecting a block.

TODO: not implemented yet

#### Enable Editing blocks inplace

You will add data attributes to where a blocks text is editable and subscribe to ```onBlockFieldChanged``` events to handle fine grained 
changes to text being edited such as turning text bold or creating a link. Hydra will notice where you have indicated a block field can 
be clicked on and will automatically make it inplace editable handling shortcuts, typing and selections for you.

TODO: not implemented yet

### Deploy your frontend

Use netlify or similar and make your frontend public and then let us know by creating a ticket and we will advertise your frontend
on https://hydra.pretagov.com for others to test.

But be sure to subscribe to the project so you can keep your frontend updated with changes to the hydra api as more 
capabilities are added. If there are bugs lets us know.


