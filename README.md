# Volto Hydra (volto-hydra)

A Google summer of code project to create a proof of concept of a CMSUI/editor for
Plone headless sites that is easy to integrate into any frontend and as easy to use
for editors as Volto is.

Note: It is a [Work in Progress: Hydra Project](https://github.com/orgs/collective/projects/3/views/4).
It should not be used in production.

Why does it matter?
- If you **want a Headless CMS**: 
   - You get the best editor UX for a headless CMS with visual editing with the bonus of being open source
- If you **don't know Volto**:
   - You get a lower learning curve if you already know a frontend framework, or just use one of the included starter frontends.  
- If you **already use Volto**:
   - you can develop frontends with faster load times, higher security and less risky Volto upgrades, with no downgrade in editor UX
   - Or continue to use Volto as your frontend only so that your frontend doesn't have to be upgraded with the CMS.
- If you are **already using Plone Headless**:
   - this will improve the editor UX with just a few lines of code

Why Hydra? 
- It gives Headless Plone a Quanta CMS UI but with one or more decoupled heads (frontends) that you can switch between while editing.
  Decoupled means they are separated from Hydra and Plone in both where they can be hosted and what framework they can use.

What is Quanta?
- [Quanta](https://github.com/plone/volto/issues/4332) is an iteration on the design system and editing UI that Volto implements
- Hydra is using Volto as it's base and where parts are reimplemented it is being done closer to the Quanta design.

## How Hydra works

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing
a two way communication channel is opened across an iframe so that the editing UI is no longer
part of the frontend code. Instead a small js file called ```hydra.js``` is included in your frontend during editing
that handles the iframe bridge communication to hydra which is running in the same browser window. Hydra.js also 
handles small parts of UI that need to be displayed on the frontend during editing.

You could think of it as splitting Volto into two parts, Rendering and CMSUI/AdminUI while keeping the same UI and then 
making the Rendering part easily replaceable with other implementations.

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

**Note**: These are simple test frontends made with minimal effort and don't include support for all the navigation and standard blocks yet.

Available example frontends:
- https://hydra-blogsite-nextjs.vercel.app (Blog style website using Next.js)
- https://hydra-vue-f7.netlify.app (mobile hybrid framework using Vue.js)
- [more examples (including source code)](https://github.com/collective/volto-hydra/tree/main/examples)

## Building a Frontend for Headless Plone

### Choose Your Framework

- You can use any frontend framework (e.g., Next.js/React, Nuxt.js/Vue, Astro etc or plain js).
- Fetch content from the Plone backend using the [@plone/client](https://github.com/plone/volto/tree/main/packages/client) 
  library or directly use [Plone restAPI](https://plonerestapi.readthedocs.io/en/latest/). You should be able to use [Plone GraphQL api](https://2022.training.plone.org/gatsby/data.html) also.
- You can start small with just simple navigation and just a few basic blocks and work up to supporting more kinds of blocks as you need them.
- There is a [set of example frontends](https://github.com/collective/volto-hydra/tree/main/examples) in different frameworks.
- If want to use static site generation then you will need the following
  - A draft mode or preview server that is used only while the editor is logged in. Hydra relies on loading changes in the browser.
  - [c.webhook](https://github.com/collective/collective.webhook) or similar to trigger the static page build process on edits or publishing.
- Pure server side rendering frameworks like Flask won't currently work but could in the future via something like a websocket proxy but would likely be too slow in practice.
- if you currently use Volto as your frontend then you should still be able to do so with a few modifications to disable it's builtin editing UI and use hydra instead (TODO)
   - This provides a backwards compatible step before you are willing to rewrite your frontend and has the benefit that  

TODO: link to more documentation on creating a frontend using @plone/client


### Test your frontend

The easiest way is to connect it directly to https://hydra-api.pretagov.com/++api++ <br />
**NOTE:** If you are testing against https://hydra-api.pretagov.com/++api++ you will need to ensure you are running on https locally via a proxy to ensure there
are no CORS errors

Or You can [run a local hydra + plone instance](#Local-Development) (see below).

### Deploy your frontend

Use Netlify or similar and make your frontend publicly accessible.
Ensure you have correctly set the CORS headers to allow access by the hydra editor. How to do this will depend
on how you host your frontend.


## Make your Frontend editable

As an integrator you have a choice on how nice you want the editor user experience to be.
The hydra.js bridge is designed with a staged approach so minimal effort will allow for basic editing
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
- Log into https://hydra.pretagov.com/ (or your test hydra), go to ```User Preferences``` and paste in your local running frontend or deployed frontend to test.
   - You can also add this url to the env ```RAZZLE_DEFAULT_IFRAME_URL``` on a local hydra instance to have this frontend selectable by the user.
   - The url should be the prefix to which the current path is appended so both /#!/path and /path style routing is supported.
- Your frontend will know to initialize the hydra iframe bridge when it is being edited using hydra as it will have an added url parameter ```_edit=true```
   - you might choose to [load `hydra.js` asynchronously](#asynchronously-load-the-bridge) so no additional js is loaded unless editing.
- You will need to [change your authentication token]((#authenticate-frontend-to-access-private-content)) you are using with the rest api so you can access the same content as the logged in editor.

Now an editor can :-
- login to hydra and see the frontend in an iframe. The result will look similar to Volto.
- browse in hydra (contents view) and your frontend page will change. 
- browse in your frontend and Hydra will change context so AdminUI actions are on the current page you are seeing.
- add a page in hydra and it will appear.
   - Note: You now need to create a page and give it a title before editing.
      - This has the benefit that images added during editing always default to being contained inside the page.  
- edit a page and after you save it will reload the iframe and the changes will appear on your frontend.
   - they will be able to add blocks the frontend specifies that it can support. (?)
- remove a page.
- all other Volto features outside editing work the same.

### Level 2: Enable Frontend block selection and Quanta Toolbar

In your frontend insert the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most html element of the rendered block html.

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

you would add in the ```data-block-uid``` so it becomes

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

Hydra.js will find these block markers and register click handlers and insert css to for you.

Now an editor can :-
- click directly on your block on the frontend preview to select it and edit the block settings in the sidebar. 
   - The block will be highlighted and a toolbar (called the quanta toolbar) will appear above it.
- selecting a block in the sidebar will highlight that block on the frontend

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

The `onEditChange` callback can be registered with the hydra.js bridge at initialisation.
When the user clicks edit on a page your frontend will now get an updated 'data' object that
follows the same format as you get from the 
[ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

e.g.
```js
const bridge = initBridge('https://hydra.pretagov.com');
bridge.onEditChange(handleEditChange);
```

Since the data structure is that same as returned by the contents RESTApi it's normally easy to rerender your page dynamically using the same
code your frontend used to render the page previously.

Now an editor can:-
- change a block in the sidebar and have it change on the frontend even as you type in WYSIWYG style
- Add and remove blocks in the sidebar and have them appear on the frontend preview
- Change page metadata and have blocks that depend on this like the "Title" block change.

These updates are sent frequently as the user makes changes in the sidebar but can adjust the frequency of updates for
performance reasons (TODO)

### Level 4: Enable Managing Blocks directly on your frontend

If you completed levels 1 to 3 (made blocks clickable and enabled live updates) then visual block management is automatically enabled.

Now an editor can :-
- click on '+' Icon directly on the frontend to add a block after the current block. This will make the BlockChooser popup appear.
   - The '+' Icon appears outside the corner of the element with ```data-bloc-uid="<<BLOCK_UID>>>``` in the direction the block will be added.
- remove a block via the Quanta toolbar dropdown
- drag and drop blocks
- open or close the block settings [TODO](https://github.com/collective/volto-hydra/issues/81)
- cut, copy and paste blocks ([TODO](https://github.com/collective/volto-hydra/issues/67))
- multiple block selection to move, delete, or copy in bulk ([TODO](https://github.com/collective/volto-hydra/issues/104))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))

#### Container Blocks ([TODO](https://github.com/collective/volto-hydra/issues/99))

Many blocks are best handled as containers of other blocks and hydra will provide a UI for you manage these sub-blocks.

Lets say you have a ColumnsBlock. A ColumnsBlock containers one or more ColumnBlock, which is a container of other blocks.
In the simplest case you don't need any special markup. Just render the blocks from "blocks" and "blocks_layout" fields with the 
```data-block-uid``` and hydra will manage the UI for you.

```html
<table data-block-uid="...">
  <tr>
    <td data-block-uid="...">
      <p data-block-uid="...">my text</p>
      <img data-block-uid="..." src="..."/>
    </td>
    <td data-block-uid="...">
      <p data-block-uid="...">other slate</p>
    </td>
  </tr>
</table>
```

Now an editor can do the following:
- Add a new sub-block visually on the frontend. The add icon is in the direction the new block will appear.
- You can see all container settings on the sidebar when a sub-block is selected, e.g. Column settings and ColumnBlock settings.
- To add another column select the parent column and click add and a new column will appear next to it.
   - Select the column by clicking "up" on the quanta toolbar or close the sub-block settings.
- remove blocks from a container
- DND blocks in and out of containers or to reorder them
- To select the container close sub-block section on the sidebar. This also allows you
  to manage the containers sub blocks from the side panel 

During editing containers are never empty to ensure they take up space and are easy to select and navigate.
This means all containers have a default block type that will get created if the last block is removed. 
By default a container allows allow other blocks and it's default block is the SlateBlock. A slate block
is special in that using the "/" shortcut you can turn it into another block.

Some containers you will need another way to pick the first block in the container. For example,
let's say you have a grid block where cells can only contain a Video or Image.
You can specify this with a container specification in ```data-block-container```.

```html
<table data-block-uid="..." data-block-container="{'allowed':['VideoBlock','ImageBlock']}">
  <tr>
    <td data-block-uid="..."><video src="..."></video></td>
    <td data-block-uid="..."><img src="..."></td>
  </tr>
</table>
```

In this case, the initial block will be of a special type called ```ChooserBlock```. Just render it to take up
the normal amount of space one of the other blocks would be expected to take up and Hydra will add a "+" icon
in the middle which allows the user to replace this dummy block with one of the actual block types. ChooserBlocks
won't get saved so won't be rendered when not editing.

The optional specifications you can give the container are

- allowed: which block types to let be added, default=[]=any block
- default: the block type to create when blocks is less than min. default=ChooserBlock or Slate if allowed.
- min: default blocks will be created to make up this number. default=1
- max: you can't add more blocks than this. default=null=unlimited
- style: ```horizontal```  or ```vertical``` to help put the "add" button in the right place. default=null=opposite of parent.
- field: You can have more than one area of sub-blocks in a container by using a different field prefix. default=blocks.
- hide_chooser_add: you might want to put in a custom add button via ```data-block-choose``` or an api call. default=false if it's a ChooserBlock

Note: The content object is itself a container so the same specifications can be used for the Page as a whole. 

### Level 5: Enable Visual frontend editing of Text, Media and links ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time visual page editing, where an editor
can change text, links or media directly on your frontend page instead of via fields on the sidebar.

#### Visual text editing

Can enable live editing of non-rich text such as the title of the teaser block, or the title of the page.

e.g. our example teaser block above we will make the title inline editable
by adding ```data-editable-field="title"``` to the html element that contains the text you want to make editable and hydra.js will do the rest.

``` html
<div class="teaser" data-block-uid="....">
<img src="/big_news.jpg"/>
<h2 data-editable-field="title">Big News</h2>
<div >Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

If the text comes from the metadata and not a block then use ```data-editable-metdata``` ([TODO](https://github.com/collective/volto-hydra/issues/118)).
- Note: ```data-editable-metadata``` isn't required to be inside a block so can make fixed parts of the page editable.

``` html
<h2 data-editable-metdata="title">My Title</h2>
```


Now an editor can :-
- click into the text on the frontend and type, adding, removing and cut and pasting
- type a "/" shortcut to change an empty text block ([TODO](https://github.com/collective/volto-hydra/issues/34))
    - Using the enter key to split the block into two text blocks and backspace to join them ([TODO](https://github.com/collective/volto-hydra/issues/33))


#### Visual Rich Text editing

For rich text (slate) you add ```data-editable-field``` to the html element contains the rich text.
For hydra.js to allow you to select and format text no matter how your frontend decides to render that formatting
just insert ```data-node-id``` attributes to the markup for a slate node when in edit made. The node ids to use are in the json
returned by ```onEditChange```.

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
    "nodeId": 1
  },
  {
    "text": ", it will change everything"
  }
]
```

the frontend could render the editable teaser block like below, being sure to include the ```data-node-id```.

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
My Paragraph with <span class="custom_link" data-node-id="5"><a href="...">a link</a></span>
</p>
```

Now an editor can :-
- select text to see what formatting has been applied and can be applied via buttons on the quanta toolbar
- select text and apply character styles (currently BOLD, ITALIC & STRIKETHROUGH)
- create or edit linked text.
- apply paragraph formatting ([TODO](https://github.com/collective/volto-hydra/issues/31))
- use markdown shortcuts like bullet and heading codes ([TODO](https://github.com/collective/volto-hydra/issues/105))
- paste rich text from the clipboard (TODO)
- and more ([TODO](https://github.com/collective/volto-hydra/issues/5))

Additionally your frontend can
- determine which types of text format (node) appear on the quanta toolbar when editing rich text, including adding custom formats ([TODO](https://github.com/collective/volto-hydra/issues/109))
- add a callback of ```onBlockFieldChange``` to rerender just the editable fields more quickly while editing (TODO)
- specify parts of the text that aren't editable by the user which could be needed for some use-cases where style includes text that needs to appear. (TODO)


Known bugs
   - if you select the whole text and change its formats your frontend might throw slate error saying `Cannot get the leaf node at path [0,0] because it refers to a non-leaf node:` but it is due to proper syncing of json b/w  hydra.js & adminUI.
   - At the end of line if you press format button then it will change the state (active/inactive) but frontend might throw slate error/warning that `Error: Cannot find a descendant at path [0,4,0] in node:` 
   - pressing ENTER is not implemented so, pressing it will have abnormal changes & error ([TODO](https://github.com/collective/volto-hydra/issues/33))
   - any text also needs to be wrapped in a ```<span data-node-id="...">``` but this will be fixed in the future.


#### Visual media uploading ([TODO](https://github.com/collective/volto-hydra/issues/36))

You can let the user upload images/videos or pick an existing file by clicking on the image on your frontend.

for example we can make the teaser image editable using ```data-editible-field```.
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

#### Visual link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

You might have a block with a link field like the Teaser block. You can also make this visually
editable using ```data-editable-field```. In edit mode the click behaviour of that element will be altered and instead
the editor can pick content to link to, enter an external url of open the url in a separate tab.

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

If you can't easily modify the markup (for example using a 3rd party component library) you can use the alternative comment syntax to specify which elements are editable.
Use css selectors to specify which elements are editable. The selectors are applied just to the following element.

e.g.
``` html
<!-- hydra_block_uid:...; img:image; h2:title; .description:desc_field; div a:url  -->
<div class="teaser">
<img src="/big_news.jpg"/>
<h2>Big News</h2>
<div class="desciption">Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a></div>
</div>
```


### Congratulations

You have now made your frontend fully editable.

If created a frontend that works with hydra.pretagov.com and you want others to try editing it
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

#### To run Nextjs example:

You can run ```npm run dev``` in `examples/hydra-nextjs/` to start the nextjs frontend at localhost:3002

#### To run Vue F7 example:

You can run ```npm run dev``` in `examples/hydra-vue-f7/` to start the vue-f7 frontend at localhost:5173

#### Asynchronously Load the Hydra.js Bridge

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
Your frontend should now use the same auth token so the you access the restapi with the same privileges and
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

### asynchronously-load-the-bridge

One way of loading the bridge asynchronously is by adding this function and calling the function at any point where you want to load the bridge.
Since your application will be loaded inside an iframe in Volto Hydra, the iframe will be passed a `_edit={true/false}` parameter that we can check for.
If this parameter is present and set to true, we should be inside the editor & are in edit mode.
```js
function loadBridge(callback) {
    const existingScript = document.getElementById("hydraBridge");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "your-hydra-js-path";
      script.id = "hydraBridge";
      document.body.appendChild(script);
      script.onload = () => {
        callback();
      };
    } else {
      callback();
    }
}

if (window.location.search.includes('_edit')) {
  loadBridge(() => {
    const { initBridge } = window
    const hydraBridgeInstance = new initBridge()
  })
}

```
