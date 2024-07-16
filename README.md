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

### Using the example frontend

You can use one of the example frontends available at `./examples` directory.

- Running Volto Hydra:
  ```bash
  make example-nextjs-admin
  ```
- Running example frontend:
  ```bash
  make example-nextjs-frontend
  ```

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

## Managing multiple frontends

To switch to a different frontend in the Volto Hydra AdminUI, follow these steps:

1. **Navigate to Personal Tools**: 
   - In the bottom of the toolbar on the left, click on "Personal Tools".

2. **Go to Preferences**: 
   - From the Personal Tools menu, select "Preferences".

3. **Change Frontend URL**: 
   - In the Preferences section, you will find an option to select the Frontend URL.
   - You can either select a frontend URL from the available options or type in a custom URL:
     - To select a URL from the options, simply choose from the dropdown menu.
     - To enter a custom URL, click on the toggle to make the input field appear and type in your desired URL.

This allows you to switch seamlessly between different frontend URLs for testing or editing purposes.

**Note**: Make sure the frontend URL is correct and accessible to avoid any CORS issues.

### Level 1: Show changes after save

To do this you will include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- Your frontend will know to initialise the hydra iframe bridge when it is being edited using hydra as it will recieve a ```?_edit=true```, [checkout below](#asynchronously-load-the-bridge) to load `hydra.js` asynchronously.
- You may need to [change your authentication token you are using with the rest api so you can access the same content as the logged in editor](#authenticate-frontend-to-access-private-content).


#### How to initialise the bridge.

- Import `initBridge` from [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js).
- Call the `initBridge` and pass the origin of your adminUI as the argument to the initBridge method.
- For example, if you are trying out demo editor, it will be: `https://hydra.pretagov.com`
  ```js
  // In Layout.js or App.js
  import { initBridge } from './hydra.js';
  const bridge = initBridge("https://hydra.pretagov.com");
  ```
- This will enable the 2 way link between hydra and your frontend.
- Log into https://hydra.pretagov.com/ (or your test hydra), go to ```User Preferences``` and paste in your local running frontend to test.
   - You can also add this url to the env ```RAZZLE_DEFAULT_IFRAME_URL``` on your hydra instance to have this frontend selectable by the user. 

Now an editor can :-
- login to hydra and see the frontend in an iframe as if it was volto
- browse in hydra your frontend page will change. 
- browse in your frontend, hydra will change context.
- add a page in hydra and it will appear.
- edit a page and after you save it will reload the iframe and the changes will appear on your frontend.
   - they will be able to add blocks the frontend specifies that it can support. 
- remove a page.
- all other volto features outside editing work the same.


**Note:** You can also pass an options object while initializing the bridge. Currently you can pass a List of allowed blocks (by default image & text blocks are allowed if not specified).
E.g. :
  ```js
  // In Layout.js or App.js
  import { initBridge } from './hydra.js';
  const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video']});
  ```

### Level 2: Click to select blocks on your frontend (Quanta Toolbar)

You will add data attributes to your rendered block html so hydra knows where they are on the page and it
will automatically handle click events and show a quanta toolbar 
and border when selecting a block.
Without this, you can still manage blocks via the blocks navigation in the sidebar.

It will allow you to naviate to the parent block ([TODO](https://github.com/collective/volto-hydra/issues/66)) but not add, remove or move blocks
unless live updates (level 3) is enabled. 

Add the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most container of the rendered block html.
The `data-block-uid` requires the block's UID, which you need to provide in the outermost container of the block.

For example, if you are using ploneClient to fetch `data`, it will be `data.blocks_layout.items[x]`.
Now, Click on your blocks in iframe and the sidebar will show its settings.

If you are rendering a Title block as

``` html
<h1>My Title</h1>
```

you would change this to

``` html
<h1 data-block-uid="....">My title</h1>
```

and now your block can be selected.

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
// Set up the onEditChange listener
//After initiating the bridge you can use its onEditChange method
const bridge = initBridge('https://hydra.pretagov.com');
bridge.onEditChange(handleEditChange);
```

Your ```handleEditChange``` callback can be hooked up to the code you wrote to render the page from Plone restapi contents.

Now any change made in the sidebar automatically appears on the frontend as you type.

### Level 4: Enable Managing Blocks directly on your frontend

If you completed level 2 & 3 (made blocks clickable and enabled live updates) then there is nothing more you need to do.

Now your editors can
- You can click on '+' Icon to add a block below the current block by choosing a type from BlockChooser popup.
   - It appears at the bottom-right of the container in which you added `data-bloc-uid="<<BLOCK_UID>>>"` attribute.
- Quanta toolbar menu let's you remove a block and open or close the block settings [TODO](https://github.com/collective/volto-hydra/issues/81)
- drag and drop blocks ([TODO](https://github.com/collective/volto-hydra/issues/65))
- cut, copy and paste blocks ([TODO](https://github.com/collective/volto-hydra/issues/67))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))
 
You will still need to edit the blocks themselves via the sidebar. 

### Level 5: Enable Editing blocks text and images inplace ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time inplace editing, where an editor
can change check, links or media by typing or clicking directly on your frontend instead of via fields on the sidebar.

#### Inline text editing ([TODO](https://github.com/collective/volto-hydra/issues/5))
You will add data attributes to where a blocks text is editable and where text formatting and features are locationed (like links).

e.g. 
``` html
<h1 data-block-uid="....">My title</h1>
```

will become
``` html
<h1 data-block-uid="...." data-editable-field="title">My <b data-node-id="2">title</b></h1>
```

You will need to add a call back to the bridge ```onBlockFieldChanged``` so that any formatting changes
such as applying bold, can be rerendered efficiently.

Thats it. Hydra will handle inplace editing, formatting and keyboard shortcuts for you. Just like you did in volto.

Shortcuts  will include
(slash ([TODO](https://github.com/collective/volto-hydra/issues/34)), 
enter ([TODO](https://github.com/collective/volto-hydra/issues/33)) and bullets etc) and 
selection (TODO](https://github.com/collective/volto-hydra/issues/31))for you.


#### Inline media uploading ([TODO](https://github.com/collective/volto-hydra/issues/36))

You can let the user upload images or pick an existing image by clicking on the image on your frontend.

```html
<div data-block-uid="....">
<img src="..." data-editible-field="image"/>
</div>
```

#### Inline link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

You might have a block with a link field like the Teaser block. You can also make this
editable. In edit mode the user clicks and can pick content to link to or enter an external url.

```html
<div data-block-uid="....">
<img src="..." data-editible-field="teaser_image"/>
<h2 data-editible-field="teaser_title">Big News</h2>
<a href="..." data-editable-field="teaser_link">Read more</a>
</div>
```


### Congratulations

You have now made your frontend fully editable.

## Code Examples

#### Asynchronously Load the Bridge

Since the script has a considerable size, it’s recommended to load the bridge only when necessary, such as in edit mode (```window.location.search.includes('_edit=true')```)
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


#### Authenticate frontend to access private content

As soon as the editor logs into the hydra editor it will load up the frontend into an iframe.
Your frontend should now use the same auth token so the you access the restapi with the same priviliges and
can render the same content.

- You can extract the `access_token` parameter directly from the URL for the `ploneClient` token option. 
- Or you can use it in Authorization header if you are using other methods to fetch content from plone Backend.

Example using nextjs 14 and ploneClient:
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

#### Preventing reloads ([TODO](https://github.com/collective/volto-hydra/issues/55))
If you wish to make the editing experience smoother you can register for ```onSave``` and ```onRoute``` callbacks to prevent reloads of the frontend

#### Simple rendering clickable blocks

Vanilla JS example:
```js

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

