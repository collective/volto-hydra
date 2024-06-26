# Volto Hydra (volto-hydra)

A volto addon to turn Plone Volto into a decoupled editor for headless Plone.

Why Hydra? because it lets you have many frontends (heads) written in many framework all connected to the same body (plone) while still letting 
you edit the content directly into your frontend. 

It is a GSoC project to prove with the following goals
- Provide an editing UI as similar to Volto as possible (with some Quanta design ideas)
- Do so with the simplest integrator instructions possible

It's Volto without having to learn any Volto.

## Want to try the editor?

You can try out the editing experience now by logging into https://hydra.pretagov.com and selecting one of the available preset frontend urls from dropdown or you can paste the url of frontend deployed for the demo site.

Available example frontends (go to `examples` directory for source code):
- https://hydra-blogsite-nextjs.vercel.app

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
- You can also set your preset frontend URLs with environment variables, making them available in the admin UI. This allows you to switch between them seamlessly:
    ```bash
    RAZZLE_DEFAULT_IFRAME_URL=http://localhost:3002,https://hydra-blogsite-nextjs.vercel.app pnpm start
    ```
    You can find `.env.example` at root directory of the project.
- Ensure Volto is running on port 3000.

**3. Start the Plone Backend**

- You can start the Plone backend using Docker images:
    ```bash
    make backend-docker-start
    ```
  ***Note :***  This will also set `CORS_ALLOW_ORIGIN` to `'*'`, so there are no cors error.
### Deploy your frontend

Use netlify or similar and make your frontend public and then let us know by creating a ticket and we will advertise your frontend
on https://hydra.pretagov.com for others to test.

But be sure to subscribe to the project so you can keep your frontend updated with changes to the hydra api as more 
capabilities are added. If there are bugs lets us know.

## Make your frontend editable

As an integrator you have a choice on how nice you want the editor user experience to be.
Each level requires more work to integrate but makes editing easier.

As the GSoC projects progresses more of these levels will be enabled so you can try them out.
see [Hydra GSoC project progresses](https://github.com/orgs/collective/projects/3/views/4)

### Level 1: Show changes after save

This is the most basic form of integration.
You can 
- add and remove pages
- navigate either using your frontend or the AdminUI
- edit a page, but only via the sidebar and you will only see changes after you click save

To do this you will include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- Your frontend will know to initialise the hydra iframe bridge when it is being edited using hydra as it will recieve a ```?_edit=true```, [checkout below](#asynchronously-load-the-bridge) to load `hydra.js` asynchronously.

#### Authenticate frontend to access private content

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

#### How to initialise the bridge.

- Import `initBridge` from [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js).
- Call the `initBridge` and pass the origin of your adminUI as the argument to the initBridge method.
- For example, if you are trying out demo editor, it will be: `https://hydra.pretagov.com`
  ```js
  // In Layout.js or App.js
  import { initBridge } from './hydra.js';
  initBridge("https://hydra.pretagov.com");
  ```
- This will enable the 2 way link between hydra and your frontend.
- Log into https://hydra.pretagov.com/ (or your test hydra), go to ```User Preferences``` and paste in your local running frontend to test.
   - You can also add this url to the env ```RAZZLE_DEFAULT_IFRAME_URL``` on your hydra instance to have this frontend selectable by the user. 

#### Asynchronously Load the Bridge

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

#### Preventing reloads ([TODO](https://github.com/collective/volto-hydra/issues/55))
If you wish to make the editing experience smoother you can register for ```onSave``` and ```onRoute``` callbacks to prevent reloads of the frontend


### Level 2: Click to select blocks on your frontend

You will add data attributes to your rendered block html so hydra knows where they are on the page and it
will automatically handle click events and show a quanta toolbar ([TODO](https://github.com/collective/volto-hydra/issues/25)) 
and border ([TODO](https://github.com/collective/volto-hydra/issues/24)) when selecting a block.
Without this, you can still manage blocks via the blocks navigation in the sidebar.

It will allow you to naviate to the parent block ([TODO](https://github.com/collective/volto-hydra/issues/66)) but not add, remove or move blocks
unless live updates (level 3) is enabled. 

Add the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most container of the rendered block html.
The `data-block-uid` requires the block's UID, which you need to provide in the outermost container of the block.

For example, if you are using ploneClient to fetch `data`, it will be `data.blocks_layout.items[x]`.
Now, Click on your blocks in iframe and the sidebar will show its settings.

Usage:
```js
// Vanilla JS example to render Blocks 

// Function to create the block list
function createBlockList(data) {
  const blockList = document.createElement('ul');

  data.blocks_layout.items.forEach(id => {
    if (data.blocks[id]["@type"] === "slate") {
      const slateValue = data.blocks[id].value;
      const listItem = document.createElement('li');
      listItem.className = 'blog-list-item';
      listItem.setAttribute('data-block-uid', id); // Set Attribute to enable Clicking on Blocks

      const pre = document.createElement('pre');
      pre.className = 'pre-block';
      pre.textContent = JSON.stringify(slateValue, null, 2);

      listItem.appendChild(pre);
      blockList.appendChild(listItem);
    }
  });

  document.body.appendChild(blockList);
}

// Call the function to render the blocks
createBlockList(data);
```

### Level 3: Enable Realtime changes while editing

You will need to subscribe to an ```onEditChange``` event that will call the callback with the updated data.

The `onEditChange` method listens for changes in the Hydra and triggers a callback with updated data.
The 'data' object follows the same format as you get from the [ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

`onEditChange` takes following args:
| Args         | Description |
| :-----------:| :-------|
| *callback*   | A function to call with the updated data when a change is detected. |

Usage:
```js
// the initial data (from ploneClient)
const initialData = data;

// Define the callback function
function handleEditChange(updatedData) {
  console.log('Updated data:', updatedData);
}

// Set up the onEditChange listener
onEditChange(handleEditChange);
```

### Level 4: Enable Managing Blocks directly on your frontend ([TODO](https://github.com/collective/volto-hydra/issues/4))

If you completed level 2 & 3 (made blocks clickable and enabled live updates) then the editor will automatically gain the management of blocks on the frontend using the quanta toolbar
- Add blocks ([TODO](https://github.com/collective/volto-hydra/issues/27))
- remove blocks ([TODO](https://github.com/collective/volto-hydra/issues/26))
- drag and drop blocks ([TODO](https://github.com/collective/volto-hydra/issues/65))
- cut, copy and paste blocks ([TODO](https://github.com/collective/volto-hydra/issues/67))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))
 
You will still need to edit the blocks themselves via the sidebar. 

### Level 5: Enable Editing blocks text and images inplace ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time inplace editing, where an editor
can change check, links or media by typing or clicking directly on your frontend instead of via fields on the sidebar.

#### Inline text editing ([TODO](https://github.com/collective/volto-hydra/issues/5))
You will add data attributes to where a blocks text is editable and where text formatting and features are locationed (like links)
and also subscribe to ```onBlockFieldChanged``` events. This will enable handling fine grained 
changes to text being edited such as turning text bold or creating a link. Hydra will notice where you have indicated a block field can 
be clicked on and will automatically make it inplace editable handling typing, shortcuts 
(slash ([TODO](https://github.com/collective/volto-hydra/issues/34)), 
enter ([TODO](https://github.com/collective/volto-hydra/issues/33)) and bullets etc) and 
selection (TODO](https://github.com/collective/volto-hydra/issues/31))for you.

#### Inline media uploading ([TODO](https://github.com/collective/volto-hydra/issues/36))

TODO

#### Inline link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

TODO


