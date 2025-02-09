# Volto Hydra (volto-hydra)

A Google summer of code project to create a proof of concept of a Visual Headless CMS
using Plone/Nick as a server, Visual editor (based on Volto) but giving you the freedom to
build your frontend in any framework.

A unique open source Headless CMS
- Quick to enable Visual editing of frontend blocks regardless of framework
- Switch between multiple frontends while visual editing
- Enterpise features such as versioning, i18n, workflow and automated content rules.
- Unique hierarchical database letting you mix and match collections and trees for storage
- Easy to implement design systems to enforce governance of content and design.
- Customisable Administration Interface
- Choice of python or javascript for your server
- Scalable and Secure with a mature battle hardened backend used by both CIA and FBI.

Note: It is a [Work in Progress: Hydra Project](https://github.com/orgs/collective/projects/3/views/4).
It shouldn't be used in production.


## Online demo

You can try out the editing experience now by logging into https://hydra.pretagov.com. 
- Go to user preferences in the bottom left
- select one of the available preset frontends 
- or paste in your own frontend url to test.

Note that the Nuxt.js frontend is deployed as a SSG to demonstrate
scale-to-zero editing so it is deploy as [SSG](https://hydra-nuxt-flowbrite.netlify.app/) 
while the edit preview is [SPA](https://hydra-nuxt-flowbrite-edit.netlify.app/).

## Run locally

Clone the Volto-Hydra repository from GitHub:

```bash
git clone https://github.com/collective/volto-hydra.git
cd volto-hydra
```

Start the Plone RESTAPI/Database
```bash
docker run -it -d --rm --name=api -p 8080:8080 -e SITE=Plone -e CORS_ALLOW_ORIGIN='*' plone/server-dev:6
```

Start a frontend. In this case we will use the Nuxt.js example
```bash
cd examples/nuxt-blog-starter
pnpm install
NUXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8080/Plone pnpm run dev
```
The frontend is at https://localhost:3000

To Edit, start the Hydra Admin interface
```bash
cd ../..
make install
RAZZLE_DEFAULT_IFRAME_URL=https://localhost:3000 pnpm start
```

Now you can login to Hydra to edit
- http://localhost:3001

## Run a local frontend with the demo CMS

```bash
    cd examples/nuxt-blog-starter
    pnpm install
    NUXT_PUBLIC_BACKEND_BASE_URL=https://hydra-api.pretagov.com pnpm run dev
```

Login to https://hydra.pretagov.com/ and in personal preferences add your front url of https://localhost:3000


## Building a Frontend for Headless Plone

The actual code you will write will depend on the framework you choose. You can look these examples to help you.

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

The steps involved in creating a frontend are roughly the same for all these frameworks

1. Create a route for any path which goes to a single page.
   - e.g. in Nuxt.js you create a file ```pages/[..slug].vue```
2. The page has a template with the static parts of your theme like header and footer etc.
   1. You might also check the content type to render each differently.
3. On page setup it takes the path, does a RESTAPI call to the contents endpoint to get the json for this page
   - You can either use plone/client for this 
   - but in some frameworks, such as Nuxt.js, is better to use their inbuilt fetch.
   - You can also [Plone GraphQL api](https://2022.training.plone.org/gatsby/data.html) 
     - however note this is just a wrapper on the RESTAPI rather than a server side implementation so it's not more efficient than using the RESTAPI directly.
4. In your page template fill title etc from the content metadata
5. For navigation
   1. adjust the contents api call to use @expand and return navigation data in the same call
   2. Create a component for your top level nav that uses this nav json to create a menu
6. For Blocks
   1. create Block component that takes the id and block json as arguments
   2. You can use a bunch of if statements to check the Block type to determine how to render than block
   3. If the block is a container you can call the Block component recursively
   4. In your page iterate down the ```blocks_layout``` list and render a Block component for each
   5. Rendering Slate you will want to split into a separate component as it's used in many blocks and is also recursive
7. There are several helper functions get reused in many blocks
   1. Generating a url for links. All RESTAPI urls are relative to the api url, so you need to convert these to the right frontend url. 
   2. Generating a url for an image. The blocks have image data in many formats so a helper function for this is useful.
      1. You maybe also decide to use your framework or hosting solution for image resizing
8. Listing Blocks
   - You can come up with your own pagination scheme. 
     - For example by embedding page into your url instead of as a query param you can having listings be statically generated.
   - In your component setup take the page and listing block json and do a RESTAPI call to get the items
   - Render the items
   - Render the pagination
9.  Redirects
   1.  if your contents call results in a redirect then you will need also do an internal redirect in the framework so the path shown is correct
   2.  if you are using SSG then you will need to some special code to download all the redirects at generate time add in redirect routes
10. Error Pages
    1.  If your RESTAPI call returns an error you will need to handle this within the framework to display the error and set the status code
11. Search Blocks and Form Blocks
   - these are a little more complex but also not so hard. TODO: example code

## Deployment

### SPA/Hybrid with Hydra

Hydra requires a SPA/Hybrid frontend if you want to have full Visual Editing.
- Deploy your frontend in as either a Single Page App or Hybrid (Server side rendering with client side rendering after first load)
- Deploy Hydra and the plone api server.
- Login in to hydra and set your frontend url.

### SSG/SSR with Hydra

It is still possible to achieve the speed and cost savings of Server Side Generation (SSG)
while still getting the benefits of Visual Editing with Hydra. Or you might require a
pure Server Side Rendered (SSR) mode.

This is achieved by 
- deploy your production frontend in SSG mode
- deploy Hydra
- deploy Plone api server with [c.webhook](https://github.com/collective/collective.webhook) and configure this to rebuild your SSG on edit.
- deploy your frontend in SPA mode and use this in Hydra for editing
- if you deploy everything (other than SSG) on a scale-to-zero hoster (like fly.io) then 
  only pay when you edit greatly reducing your costs.

### Two-Window editing (without hydra)

You can use Plone Headless without Hydra but it could confuse your users as the site won't look like your frontend.

- Deploy a Volto site with a default theme
- Deploy your frontend
- Setup your content types and block types
  - Currently adding new blocks requires a custom Volto theme to be deployed.
- This will come with an out of the box theme so it won't look the same as your frontend
  - Any new blocks you create will have a skeleton presentation within the preview
- Once done editing a page, you can switch to the frontend URL and see how the changes look on your frontend
  - if the page is private you will additionally have to implement a way to login on your frontend to see these pages
- If you need a more WYSIWYG editing experience
  - Either use Hydra
  - Or use Volto theming to recreate design inside volto, or close enough so your editors are happy.

## Enabling Visual Editing (with hydra)

Hydra provides a live preview of your frontend using an iframe.
With no added integration the page will not change until after save.
None of the follow steps require much work but each adds a richer editing experience for the
editors.

### Level 1: Schemas and Page Switching

This will enable an Editor to :-
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


To do this you will include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- During editing, tnitilize it with the url of Hydra and Volto settings
  ```js
  import { initBridge } from './hydra.js';
  const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video']});
  ```
- To know you are in edit mode an extra url param is added to your frontend ```_edit=true``` (see [Lazy Loading](#lazy-load-the-bridge))
- To see private content you will need to [change your authentication token]((#authenticate-frontend-to-access-private-content))
- You can configure any Volto settings during init. Such as
   - change allowedBlock types
   - Add a new block type including it's schema (TODO)
   - disable existing blocks or adjust their schema (TODO)
   - You can also install content type definitions. (TODO)
   - determine which types of text format (node) appear on the quanta toolbar when editing rich text, including adding custom formats ([TODO](https://github.com/collective/volto-hydra/issues/109))
   - determine which shortcuts appear on the quanta toolbar for a given block (TODO)
- You can pass in a function to map plone url paths to frontend paths if there is not a one to one mapping
- Note either hashbang ```/#!/path``` or normal ```/path``` style paths are supported.


### Level 2: Enable Frontend block selection and Quanta Toolbar

This will enable an Editor to :-
- click directly on your block on the frontend preview to select it and edit the block settings in the sidebar. 
   - The block will be highlighted and a toolbar (called the quanta toolbar) will appear above it.
- selecting a block in the sidebar will highlight that block on the frontend

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

If are using a 3rd party library to render a block and you can't change the markup then use 
the alternative [Comment systax](#comment-syntax) 

### Level 3: Enable Realtime changes while editing

This will enable an Editor to:-
- change a block in the sidebar and have it change on the frontend even as you type in WYSIWYG style
- Add and remove blocks in the sidebar and have them appear on the frontend preview
- Change page metadata and have blocks that depend on this like the "Title" block change.

Note: For level 3 and beyond you need a frontend deployed as SPA or hybrid (rather than SSR or SSG). If your production deploy is
SSG or SSR then deploy another edit only preview frontend. For many modern frameworks this is just a settings toggle.

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

These updates are sent frequently as the user makes changes in the sidebar but can adjust the frequency of updates for
performance reasons (TODO)

### Level 4: Enable Managing Blocks directly on your frontend

If you completed levels 1 to 3 (made blocks clickable and enabled live updates) then visual block management is automatically enabled.

This will enable an Editor to :-
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

This will enable an Editor to :-
- Add a new sub-block visually on the frontend. The add icon is in the direction the new block will appear.
- You can see all container settings on the sidebar when a sub-block is selected, e.g. Column settings and ColumnBlock settings.
- To add another column select the parent column and click add and a new column will appear next to it.
   - Select the column by clicking "up" on the quanta toolbar or close the sub-block settings.
- remove blocks from a container
- DND blocks in and out of containers or to reorder them
- To select the container close sub-block section on the sidebar. This also allows you
  to manage the containers sub blocks from the side panel 


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

Some container blocks don't have all sub-blocks visible all the time such as Tabs or Slider blocks or have buttons outside the sub-block that the user
   might expect would select the sub-block.
- Hydra will attempt to detect when the selected block is hidden and switch selection but in some cases this doesn't work.
- You can use ```data-block-selector="block_uid"``` on buttons or links that result in selecting a block. You can also use -1, +1 etc 
  to select the previous or next block.
- In the case a block is selected in the sidebar
  - if the ```data-block-selector``` exists for that block id, that element it will have a click event sent to it.
  - You can also set a callback during hydra.js init, ```onHandleBlockSelection```.

### Level 5: Enable Visual frontend editing of Text, Media and links ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time visual page editing, where an editor
can change text, links or media directly on your frontend page instead of via fields on the sidebar.

#### Visual text editing

This will enable an Editor to :-
- click into the text on a block on the frontend and type, adding, removing and cut and pasting.
- Edit metadata of the page inside a block, e.g. Title block
- type a "/" shortcut to change an empty text block ([TODO](https://github.com/collective/volto-hydra/issues/34))
    - Using the enter key to split the block into two text blocks and backspace to join them ([TODO](https://github.com/collective/volto-hydra/issues/33))

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


#### Visual Rich Text editing

This will enable an Editor to :-
- select text to see what formatting has been applied and can be applied via buttons on the quanta toolbar
- select text and apply character styles (currently BOLD, ITALIC & STRIKETHROUGH)
- create or edit linked text.
- apply paragraph formatting ([TODO](https://github.com/collective/volto-hydra/issues/31))
- use markdown shortcuts like bullet and heading codes ([TODO](https://github.com/collective/volto-hydra/issues/105))
- paste rich text from the clipboard (TODO)
- and more ([TODO](https://github.com/collective/volto-hydra/issues/5))


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

Additionally your frontend can
- add a callback of ```onBlockFieldChange``` to rerender just the editable fields more quickly while editing (TODO)
- specify parts of the text that aren't editable by the user which could be needed for some use-cases where style includes text that needs to appear. (TODO)

Known bugs
   - if you select the whole text and change its formats your frontend might throw slate error saying `Cannot get the leaf node at path [0,0] because it refers to a non-leaf node:` but it is due to proper syncing of json b/w  hydra.js & adminUI.
   - At the end of line if you press format button then it will change the state (active/inactive) but frontend might throw slate error/warning that `Error: Cannot find a descendant at path [0,4,0] in node:` 
   - pressing ENTER is not implemented so, pressing it will have abnormal changes & error ([TODO](https://github.com/collective/volto-hydra/issues/33))
   - any text also needs to be wrapped in a ```<span data-node-id="...">``` but this will be fixed in the future.


#### Visual media uploading ([TODO](https://github.com/collective/volto-hydra/issues/36))

This will enable an Editor to :-
- Be presented with a empty media element on the frontend and and a prompt to upload or pick media ([TODO](https://github.com/collective/volto-hydra/issues/112))
- Remove the currently selected media to pick a different one ([TODO](https://github.com/collective/volto-hydra/issues/36))
- DND an image diretly only a media element on the frontend ([TODO](https://github.com/collective/volto-hydra/issues/108))

for example we can make the teaser image editable using ```data-editible-field```.
```html
<div class="teaser" data-block-uid="....">
<img data-editible-field="image" src="/big_news.jpg"/>
<h2>Big News</h2>
<div>Check out <b>hydra</b>, it will change everything</div>
<div><a href="/big_news">Read more</a><div>
</div>
```

#### Visual link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

This will enable an Editor to :-
- Click on a link or button on the frontend to set or change the link with either an external or internal url ([TODO](https://github.com/collective/volto-hydra/issues/68))
- Click on a link/button to optionally open the link in a new tab ([TODO](https://github.com/collective/volto-hydra/issues/111))

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

#### Custom Visual Editing (TODO)
In some rare cases you might want to provide editors with more visual editing than hydra currently supports. For example a newly created table block 
might display a form to set the initial number of columns and rows. In this case you can use
- ```sendBlockUpdate``` hydra.js api to send an updated version of the block after changes.
- ```sendBlockAction``` hydra.hs api to do actions like select,add, move, copy or remove blocks or perform custom actions on the Volto block edit component.
- more direct support for initial setup widgets that appear on empty blocks might be supported by hydra in the future.

### Comment syntax ([TODO](https://github.com/collective/volto-hydra/issues/113))

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


### Advanced

#### Lazy Load the Hydra.js Bridge

One way of loading the bridge lazily is by adding this function and calling the function at any point where you want to load the bridge.
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

