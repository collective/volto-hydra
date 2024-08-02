# Volto Hydra (volto-hydra)

A Google summer of code project to create a proof of concept of 
volto addon to turn Plone Volto into a decoupled editor for Headless Plone.

Note: It is a [Work in Progress: Hydra Project]((https://github.com/orgs/collective/projects/3/views/4).
It should not be used in production.

Why does it matter?
- If you **want a Headless CMS**: 
   - You get the best editor UX for a headless CMS with inplace visual editing with the bonus of being open source
- If you **don't know Volto**:
   - You get a lower learning curve if you already know a frontend framework, or just use one of the included starter frontends.  
- If you **already use Volto**:
   - you can develop frontends with faster load times, higher security and less risky Volto upgrades, with no downgrade in editor UX
- If you are **already using Plone Headless**:
   - this will improve the editor UX with just a few lines of code

Why Hydra? 
- It gives Headless Plone a Quanta CMS UI but with one or more decoupled heads (frontends) that you can switch between while editing.
  Decoupled means they are seperated from Hyrda and Plone in both where they can be hosted and what framework they can use.

What is Quanta?
- [Quanta](https://github.com/plone/volto/issues/4332) is an iteration on the design system and editing UI that Volto impliments
- Hydra is using Volto as it's base and where parts are reimplimented it is being done closer to the Quanta design.

## How Hydra works

Instead of combining editing and rendering into one framework and codebase, these are seperated and during editing
a two way communication channel is opened across an iframe so that the editing UI is no longer
part of the frontend code. Instead a small js file called ```hydra.js``` is included in your frontend during editing
that handles the iframe bridge communication to hydra which is running in the same browser window. Hydra.js also 
handles small parts of UI that need to be displayed on the frontend during editing.

You could think of it as spliting Volto into two parts, Rendering and CMSUI/AdminUI while keeping the same UI and then 
making the Rendering part easily replacable with other implementations.

```
                          Browser            RestAPI             Server              
                                                                                     
                                                                                     
                      ┌──────────────┐                       ┌─────────────┐         
                      │              │                       │             │         
   Anon/Editing       │    Volto     │◄─────────────────────►│    Plone    │         
                      │              │                       │             │         
                      └──────────────┘                       └─────────────┘         
                                                                                     
                                                                                     
─────────────────────────────────────────────────────────────────────────────────────
                                                                                     
                                                                                     
                  │   ┌──────────────┐                       ┌─────────────┐         
                  │   │              │                       │             │         
                  │   │   Frontend   │◄──────────────────────┤    Plone    │         
                  │   │              │                       │             │         
                  │   └──hydra.js────┘                       └─────────────┘         
                  │          ▲                                  ▲                    
   Editing       UI          │ iFrame Bridge                    │                    
                  │          ▼                                  │                    
                  │   ┌──────────────┐                          │                    
                  │   │              │                          │                    
                  │   │    Hydra     │◄─────────────────────────┘                    
                  │   │              │                                               
                  │   └──────────────┘                                               
                                                                                     
                                                                                     
                      ┌──────────────┐                       ┌─────────────┐         
                      │              │                       │             │         
   Anon               │   Frontend   │◄──────────────────────┤    Plone    │         
                      │              │                       │             │         
                      └──────────────┘                       └─────────────┘         
             
```



## Want to try the editor?

You can try out the editing experience now by logging into https://hydra.pretagov.com. 
Go to user preferences in the bottom left to select one of the available preset frontends or paste in your own frontend url to test.

Available example frontends (go to `examples` directory for source code):
- https://hydra-blogsite-nextjs.vercel.app

Note: These are simple test frontends made with minimal effort and don't include support for all the navigation and block of volto yet.

## Building a Frontend for Headless Plone

### Choose Your Framework

- You can use any frontend framework (e.g., Next.js/React, Nuxt.js/Vue, Astro etc or plain js).
  - Static site generators like Gatsby and server side rendering like Flask could work but without realtime updates
    and inline editing. Your frontend would lack browser based code to render content dynamically but in the future
    it could be possible for these edits to go via the backend making near realtime editing possible.
- Fetch content from the Plone backend using the [@plone/client](https://github.com/plone/volto/tree/main/packages/client) 
  library or directly use [Plone restAPI](https://plonerestapi.readthedocs.io/en/latest/). You should be able to use [Plone GraphQL api](https://2022.training.plone.org/gatsby/data.html) also.
- You can start small with just simple navigation and just a few basic blocks and work up to supporting more kinds of blocks as you need them.
- There is a [set of example frontends](https://github.com/collective/volto-hydra/tree/main/examples) in different frameworks.

TODO: link to more documentation on creating a frontend using @plone/client

### Test your frontend

You can either run a local hydra instance (see below) or connect it directly to https://hydra.pretagov.com/++api++

If you are testing against https://hydra.pretagov.com/++api++ you will need to ensure you are running on https locally via a proxy to ensure there
are no CORS errors

### Deploy your frontend

Use netlify or similar and make your frontend publicly accessible.
Ensure you have correctly set the CORS headers to allow access by the hydra editor. How to do this will depend
on how you host your frontend.

You can then log into https://hydra.pretagov.com and set the frontend to edit in the user settings.


## Make your Frontend editable

As an integrator you have a choice on how nice you want the editor user experience to be.
The hydrajs bridge is designed with a staged approach so minimal effort will allow for basic editing
and further integration work will get you back to the full inline editing experience similar to Volto.

### Level 1: Enable Switching pages and showing changes *after* save

To do this you will include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- Import `initBridge` from [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js).
- Call the `initBridge` and pass the origin of your adminUI as the argument to the initBridge method.
- For example, if you are trying out demo editor, it will be: `https://hydra.pretagov.com`
  ```js
  // In Layout.js or App.js
  import { initBridge } from './hydra.js';
  const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video']});
  ```
- Log into https://hydra.pretagov.com/ (or your test hydra), go to ```User Preferences``` and paste in your local running frontend to test.
   - You can also add this url to the env ```RAZZLE_DEFAULT_IFRAME_URL``` on your hydra instance to have this frontend selectable by the user. 
- Your frontend will know to initialise the hydra iframe bridge when it is being edited using hydra as it will recieve a ```?_edit=true```, [checkout below](#asynchronously-load-the-bridge) to load `hydra.js` asynchronously.
- You may need to [change your authentication token]((#authenticate-frontend-to-access-private-content)) you are using with the rest api so you can access the same content as the logged in editor.

Now an editor can :-
- login to hydra and see the frontend in an iframe as if it was volto
- browse in hydra your frontend page will change. 
- browse in your frontend, hydra will change context.
- add a page in hydra and it will appear.
- edit a page and after you save it will reload the iframe and the changes will appear on your frontend.
   - they will be able to add blocks the frontend specifies that it can support. 
- remove a page.
- all other volto features outside editing work the same.

### Level 2: Enable Frontend block selection and Quanta Toolbar

Add the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most container of the rendered block html.

For example, let's say your frontend is rendering a simple Teaser block

Your frontend might choose to render a Teaser like
``` html
<div class="teaser">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

you would addin the ```data-block-uid``` so it becomes

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

Hydrajs will find these block markers and register click handlers and insert css to for you.

Now an editor can :-
- click directly on your block on the frontend preview to edit the block contents in the sidebar. 
   - The block will be highlighted and a toolbar (called the quanta toolbar) will appear above it.
- selecting a block in the sidebar will highlight that block on the frontend
- naviate to the parent block ([TODO](https://github.com/collective/volto-hydra/issues/66)) 

If are using a 3rd party library to render a block, then you might not be able to easily modify the markup 
to put in the ```data-block-uid```. Instead you can use an alternative 
comment syntax ([TODO](https://github.com/collective/volto-hydra/issues/113)) where a comment goes
directly before the block markup.

e.g.
``` html
<!-- hydra_block_uid:... -->
<div class="teaser">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```


### Level 3: Enable Realtime changes while editing

The `onEditChange` callback can be registered with the hydrajs bridge at initialisation.
When the user clicks edit on a page your frontend will now get an updated 'data' object that
follows the same format as you get from the 
[ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

e.g.
```js
const bridge = initBridge('https://hydra.pretagov.com');
bridge.onEditChange(handleEditChange);
```

If you are using [ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories)
your handler is likely the same code that rendered the page originally.

Now an editor can:-
- change a block in the sidebar and have it change on the frontend even as you type in WYSIWYG style
- Add and remove blocks in the side bar and have them appear on the frontend preview
- Change page metadata and have blocks that depend on this like the "Title" block change.

These updates are sent frequently as the user makes changes in the sidebar but can adjust the frequency of updates for
performance reasons (TODO)

### Level 4: Enable Managing Blocks directly on your frontend

If you completed levels 1 to 3 (made blocks clickable and enabled live updates) then there is nothing more you need to do.

Now an editor can :-
- click on '+' Icon directly on the frontend to add a block below the current block by choosing a type from BlockChooser popup.
   - It appears at the bottom-right of the container in which you added `data-bloc-uid="<<BLOCK_UID>>>"` attribute.
- remove a block via the Quanta toolbar dropdown
- open or close the block settings [TODO](https://github.com/collective/volto-hydra/issues/81)
- drag and drop blocks ([TODO](https://github.com/collective/volto-hydra/issues/65))
- cut, copy and paste blocks ([TODO](https://github.com/collective/volto-hydra/issues/67))
- multiple block selection to move, delete, or copy in bulk ([TODO](https://github.com/collective/volto-hydra/issues/104))
- add and manage blocks inside containers like a columns block ([TODO](https://github.com/collective/volto-hydra/issues/99))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))
 
### Level 5: Enable Inplace frontend editing of Text, Media and links ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time inplace editing, where an editor
can change text, links or media directly on your frontend instead of via fields on the sidebar.

#### Inline text editing ([TODO](https://github.com/collective/volto-hydra/issues/5))
You will add data attributes to where a block text is editable.

e.g. our example teaser block above we will make the heading inline editable
by just adding ```data-editable-field="title"``` to the element you want to make editable and hydrajs will do the rest.

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2 data-editable-field="title">Big News</h2>
<div >Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

Now an editor can :-
- click into rich text and type, adding, removing and cut and pasting, all directly on the frontend. [TODO](https://github.com/collective/volto-hydra/issues/29)
- apply paragraph formatting ([TODO](https://github.com/collective/volto-hydra/issues/31))
- create or edit a rich text link [TODO](https://github.com/collective/volto-hydra/issues/35)
- type a "/" shortcut to change an empty text block ([TODO](https://github.com/collective/volto-hydra/issues/34))
- type "enter" at the end of a text block to create a new block ([TODO](https://github.com/collective/volto-hydra/issues/33))

Additionally your frontend can
- specify parts of the text that aren't editable by the user (TODO)

#### Inline Rich Text editing ([TODO](https://github.com/collective/volto-hydra/issues/5))

For rich text (slate) you will have to do a little more work.

Rich text comes via the contents restiapi as a semantic structure in json using nodes rather than as html.
Your frontend could choose to represent that formatting using whatever html you want, however for hydra.js 
to keep track of what text the editor is changing you will need to add ```data-node-id``` attributes to the outermost
html that contains a rich text node. 

These node ids aren't available from the plone restapi but only via the hydra.js bridge, so you will need hook
into ```onEditChange``` to rerender your content with the node ids it provides to make inplace editing work.

For example, if the schema for the Teaser block had the description field type as rich text then 
the json value might be

``` json
[
  {
    "text": "Check out "
  }
  {
    "children": [
      {
        "text": "hydra"
      }
    ],
    "type": "bold",
    "id": 1
  },
  {
    "text": ", it will change everything"
  }
]
```

and the frontend could render the editible teaser block like below, being sure to include the ```data-node-id```.

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div data-editable-field="description">Check out <b data-node-id="1">hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

A slate block is just a special case with a single rich tech editable field

``` html
<p data-block-uid="...." data-editable-field="value">
My Paragraph with <span class="custom" data-node-id="5"><a href="...">a link</a></span>
</p>
```



Hydra.js will now adjust the quanta toolbar with formatting buttons.

Now an editor can :-
- select text and apply formating ([TODO](https://github.com/collective/volto-hydra/issues/31))
- apply paragraph formatting ([TODO](https://github.com/collective/volto-hydra/issues/31))
- create or edit a rich text link [TODO](https://github.com/collective/volto-hydra/issues/35)
- use markdown shortcuts like bullet and heading codes ([TODO](https://github.com/collective/volto-hydra/issues/105))

Additionally your frontend can
- determine which types of text format (node) appear on the quanta toolbar when editing rich text, including adding custom formats ([TODO](https://github.com/collective/volto-hydra/issues/109))
- add a callback of ```onBlockFieldChange``` to rerender just the editable fields more quickly while editing (TODO)

Note Hydra.js knows about the schema of your blocks and based on the field name will determine what what to make your html editable.

#### Inline media uploading ([TODO](https://github.com/collective/volto-hydra/issues/36))

You can let the user upload images/videos or pick an existing file by clicking on the image on your frontend.

``` html
<div class="teaser" data-block-uid="....">
<img data-editible-field="image" src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

Now an editor can :-
- Be presented with a empty media element on the frontend and and a prompt to upload or pick media ([TODO](https://github.com/collective/volto-hydra/issues/112))
- Remove the currently selected media to pick a different one ([TODO](https://github.com/collective/volto-hydra/issues/36))
- DND an image diretly only a media element on the frontend ([TODO](https://github.com/collective/volto-hydra/issues/108))

#### Inline link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

You might have a block with a link field like the Teaser block. You can also make this
editable. In edit mode the user clicks and can pick content to link to or enter an external url.

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a data-editable-field="href" href="/big_news">Read more</a></div>
</div>
```

Now as editor can :-
- Click on a link or button on the frontend to set or change the link with either an external or internal url ([TODO](https://github.com/collective/volto-hydra/issues/68))
- Click on a link/button to optionally open the link in a new tab ([TODO](https://github.com/collective/volto-hydra/issues/111))

### Comment syntax (TODO)

If you can't easily modify the markup you can use the altetrnative comment synatx to specify which elements are editable.
Use css selectors to specify which elements are editible. The selectors are applied just to the following element.

e.g.
``` html
<!-- hydra_block_uid:...; img:image; h2:title; .description:text; div a:link  -->
<div class="teaser">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div class="desciption">Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a></div>
</div>
```


### Congratulations

You have now made your frontend fully editable.

If deployed your frontend and want others to try editing it
then let us know by [creating a ticket](https://github.com/collective/volto-hydra/issues)


## Local Development

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
  ***Note :***  This will also set [`CORS_ALLOW_ORIGIN` to `'*'`](https://6.docs.plone.org/install/containers/images/backend.html?highlight=cors#cors-variables), so there are no cors error.

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


## Code Examples

There is a [set of example frontends](https://github.com/collective/volto-hydra/tree/main/examples) in different frameworks 
in the github repo that might help you. In addition, here are some examples on how you could handle 
hooking into the hydra bridge.

#### Asynchronously Load the Hydrajs Bridge

You don't need to load the hydra bridge until the user logs into the editor so it’s recommended to load the bridge only when necessary, such as in edit mode (```window.location.search.includes('_edit=true')```)
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
can render the same content including private content.

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
If you wish to make the editing experience smoother you can register for ```onRoute``` callbacks to prevent the frontend being forced to reload
at certain times using the hydra editor.

#### Simple rendering clickable blocks

This is an example of how you could write code to render your blocks, inserting the ```data-block-id``` so
that the hydra bridge can make those blocks selectable.

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

