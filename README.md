# Volto Hydra (volto-hydra)

A Visual Headless CMS using Plone/Nick as a server, an Administration interface (based on Volto).
Hydra provides true visual editor with drag and drop blocks and editable text but with any frontend stack you choose. 
No assumptions. No learning curve.

A unique open source Headless CMS
- Quick to enable Visual editing of frontend blocks regardless of framework
- Switch between multiple frontends while visual editing. Perfect for omni-channel.
- Enterpise features such as versioning, i18n, workflow and automated content rules.
- Unique hierarchical database letting you mix and match collections and trees for storage
- Easier to implement design systems that enforce governance of content and design.
- Customisable Administration Interface
- Choice of python or javascript for your server
- Scalable and Secure with a mature battle hardened backend used by both CIA and FBI.

Note: It is a [Work in Progress: Hydra Project](https://github.com/orgs/collective/projects/3/views/4).
It shouldn't be used in production. It was kicked off as a GSoC project.


## Online demo

You can try out the editing experience now by logging into https://hydra.pretagov.com. 
- Go to user preferences in the bottom left
- select one of the available preset frontends 
- or paste in your own frontend url to test.

Note that the default is a Nuxt.js frontend, deployed as a [SSG](https://hydra-nuxt-flowbrite.netlify.app/) 
to demonstrate scale-to-zero editing (free hosting) see [SSG/SSR with Hydra](./ssg_ssr_with_hydra)

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
RAZZLE_API_PATH="http://localhost:8080/Plone" RAZZLE_DEFAULT_IFRAME_URL=https://localhost:3000 pnpm start
```

Now you can login to Hydra to edit
- http://localhost:3001

## Run local frontend only

You can develop your frontend locally against a deployed CMS, for example.

```bash
    cd examples/nuxt-blog-starter
    pnpm install
    NUXT_PUBLIC_BACKEND_BASE_URL=https://hydra-api.pretagov.com pnpm run dev
```

Login to https://hydra.pretagov.com/ and in personal preferences add your front url of https://localhost:3000


## Building your Frontend

The actual code you will write will depend on the framework you choose. You can look these examples to help you.

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

The steps involved in creating a frontend are roughly the same for all these frameworks so we have written a [guide to 
building a Headless Frontend to Plone RESTAPI](./#building-a-frontend-for-headless-plone)

## Deployment

### SPA/Hybrid with Hydra

Hydra requires a SPA or Hybrid frontend if you want to have full Visual Editing.
- Deploy your frontend in as either a Single Page App (SPA) or Hybrid (Server side rendering with client side rendering after first load)
- Deploy Hydra and the plone api server.
- Login in to hydra and set your frontend url.

### SSG/SSR with Hydra

It is still possible to achieve the speed and cost savings of Server Side Generation (SSG)
while still getting the benefits of Visual Editing with Hydra. Or you might require a
pure Server Side Rendered (SSR) mode.

To achieve this
- deploy your production frontend in SSG or SSR mode
- deploy Hydra and Plone api server
   - note this only has to run during editing so scale-to-zero/serverless is an option
- deploy your same frontend in SPA mode to another url which is only used in Hydra for editing
- For SSG you will also need [c.webhook](https://github.com/collective/collective.webhook) and configure this to rebuild your SSG on edit.
   - For a SSR frontend c.webhook is not needed 


For example, fro the default Nuxt.js demo frontend:
- The production frontend is deployed as a [SSG on netlify](https://hydra-nuxt-flowbrite.netlify.app/).
   - Images and listings are all statically generated
   - Search can't be SSG but with scale-to-zero and suspend hosting the cold start delay of a search might be an acceptable tradeoff.
- The Administration interface (https://hydra.pretagrov.com) and Plone server is deployed to fly.io using scale-to-zero so the cost is free or minimal
- During editing, a different deployment ([SPA on netlify](https://hydra-nuxt-flowbrite-edit.netlify.app/)) of the same frontend is used


### Two-Window editing (without hydra)

You can use Plone Headless without Hydra using Volto instead

- Deploy the Plone api server
- Deploy your frontend
- Deploy a Volto site with a default theme
- Setup your content types and block types
  - Currently adding new blocks requires a custom Volto theme to be deployed.
  - Content types can be added by site setup
- During Editing
  - You will use Volto which will come with an out of the box theme so it won't look the same as your frontend
  - Any new blocks you create will have a skeleton presentation within the preview
  - Any header/footer css etc won't reflect your frontend
  - Once done editing a page, you can ask users to switch to another tab and use the frontend URL and see how the changes look on your frontend
     - if the page is private you will additionally have to implement a way to login on your frontend to see these pages
- If you need a more WYSIWYG editing experience
  - Use Volto theming to recreate design inside volto, or close enough so your editors are happy.
    - this would be a duplicate any effort you did on the frontend.
  - Or just use Hydra

## Enabling Visual Editing (with hydra)

Hydra provides a live preview of your frontend using an iframe which is in the middle of the screen.
By adding simple optional levels of hints in your frontend code, hydra will add overlays so 
Visual DND editing is enabled.


```
CMS-Toolbar           Frontend in iframe (hydra adds minimal block select/edit UI)             CMS-Sidebar               
                                                                                                                         
┌───────┐───────────────────────────────────────────────────────────────────────────────┌───────────────────────────────┐
│       │                                                                               │                               │
│ ┌──┐  │                                                                               │   Page                        │
│ │  │  │                                                                               │                               │
│ └──┘  │      ┌──┬┬──┬┬──┐                                                             │     Title                     │
│ ┌──┐  │      │::││  ││…⋎│                                                             │     ┌────────────────────┐    │
│ │  │  │      └──┴┴──┴┴──┘                                                             │     │ My Page Title      │    │
│ └──┘  │      ┌──────────────────────────────────────────────────────────┐┌───┐        │     └────────────────────┘    │
│       │      │                              ┌─────────────────────────┐ ││ + │        │                               │
│       │      │  Big News                    │                         │ │└───┘        │                               │
│       │      │                              │                         │ │             │   Slider Block                │
│       │      │  Checkout hydra, it will     │                         │ │             │                               │
│       │    < │  change everything           │                         │ │ >           │     Slide delay               │
│       │      │                              │                         │ │             │     ┌──────────┐              │
│       │      │  ┌───────────┐               │                         │ │             │     │ 5        │              │
│       │      │  │ Read more │               │                         │ │             │     └──────────┘              │
│       │      │  └───────────┘               └─────────────────────────┘ │             │                               │
│       │      └──────────────────────────────────────────────────────────┘             │                               │
│       │                                 1 2 3 4                                       │   Slide Block                 │
│       │                                                                               │                               │
│       │                                                                               │     Slide Title               │
│       │                                                                               │     ┌────────────────────┐    │
│       │      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed             │     │ Big News           │    │
│       │                                                                               │     └────────────────────┘    │
│       │      do eiusmod tempor incididunt ut labore et dolore magna aliqua.           │                               │
│       │                                                                               │     Image                     │
│       │      Ut enim ad minim veniam, quis nostrud exercitation ullamco               │     ┌────────────────────┐    │
│       │                                                                               │     │                    │    │
│       │      laboris nisi ut aliquip ex ea commodo consequat.                         │     │                    │    │
│       │                                                                               │     │                    │    │
│       │                                                                               │     │                    │    │
│       │                                                                               │     └────────────────────┘    │
│       │                                                                               │                               │
│       │                                                                               │                               │
└───────┘───────────────────────────────────────────────────────────────────────────────└───────────────────────────────┘
```

- With no integration the preview frontend tracks CMS navigation and refresh after save.
- Level 1: tracks frontend to navigate to change CMS context to quickly edit the current page including private pages
- Level 2: allows your frontend to define custom content types and block types
- Level 3: will allow you to select blocks inside this preview but not see any changes
- Level 4: allows you to see changes in realtime and lets you manage blocks
- Level 5: lets the user edit text, images and links directly on the preview
- Level 6: if needed, customise CMS UI or more complex visual editing in the frontend

### Level 0: Headless frontend with vanila volto (no hydra visual editing)

First is to start with a frontend technology of your choice.
Since our goal is to no modify the CMS we will initially be stuck with the out of the box volto block types.

A very minimal vue/nuxt.js example would have 

a code to get content from the backend rest api

```
//TODO
```

a template for a page

```
//TODO
```

and another to render blocks

```
//TODO
```

Now you have Headless Plone and you can edit using a volto instance (that will look like out of the box Plone)
and your custom frontend. After saving en edit in volto can refresh your frontend tab and see the changes.


### Level 1: Preview with Page Switching and authentication

This will enable an Editor to :-
- login to hydra and see the frontend in an iframe. The result will look similar to Volto.
- browse in hydra (contents view) and your frontend page will change. 
- browse in your frontend and Hydra will change context so AdminUI actions are on the current page you are seeing.
- add a page in hydra and it will appear.
   - Note: You now need to create a page and give it a title before editing.
      - This has the benefit that images added during editing always default to being contained inside the page.  
- edit a page
   - selecting, adding, editing and rearranging the block layout all is done via the sidebar
      - You will see more fields than normal volto to make this possible 
   - only after you save it will reload the iframe and the changes will appear on your frontend.
   - (later it should be possible do live updates even with SSR but via the RESTAPI) - TODO
- remove a page.
- all other CMS features such as site setup, contents, worklow will work the same as Volto
   - History won't show a visual diff (TODO explore if there is a way...) 

To do this you will include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- During editing, tnitilize it with the url of Hydra and Volto settings
  ```js
  import { initBridge } from './hydra.js';
  const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video']});
  ```
- To know you are in edit mode an extra url param is added to your frontend ```_edit=true``` (see [Lazy Loading](#lazy-load-the-bridge))
- To see private content you will need to [change your authentication token]((#authenticate-frontend-to-access-private-content))

### Level 2: Custom Content types and Blocks


- You can configure any Volto settings during init. Such as
   - change allowedBlock types
   - Add a new block type including it's schema (TODO)
   - disable existing blocks or adjust their schema (TODO)
   - You can also install content type definitions. (TODO)
   - determine which types of text format (node) appear on the quanta toolbar when editing rich text, including adding custom formats ([TODO](https://github.com/collective/volto-hydra/issues/109))
   - determine which shortcuts appear on the quanta toolbar for a given block (TODO)
   - add or change the formatting options for slate (TODO)
- You can pass in a function to map plone url paths to frontend paths if there is not a one to one mapping
- Note either hashbang ```/#!/path``` or normal ```/path``` style paths are supported.


Let's take a specific example of a slider block you want to have available for your editors. This is not a default block type so 
you will need to add it custom. Normally this would require developing a volto plugin and installing it into your custom volto instance.


For our slider example, we can configure this new block directly in the frontend

```js
const customBlocks = {
  slider: {
    id: 'slider', // The name (id) of the block
    title: 'Slider', // The display name of the block
    icon: 'data:...', // The icon used in the block chooser
    group: 'common', // The group (blocks can be grouped, displayed in the chooser)
    restricted: false,
    mostUsed: true, // A meta group `most used`, appearing at the top of the chooser
    blockSchema: {
      properties: {
        slider_timing: {
          title: "time",
          widget: 'float',
        }
        slides: {
          title: "Slides",
          type: 'blocks',
          allowedBlocks: ['slide', 'image'],
          defaultBlock: 'slide',
          maxLength=10,
          blocksConfig={
            slide: {
              id: 'slide', // The name (id) of the block
              title: 'Slide', // The display name of the block
              blockSchema: {
                fieldsets: [
                  {
                    id: 'default',
                    title: "Settings",
                    fields: ['url', 'title', 'image', 'description'],
                  },
                ],
                properties: {
                  url: {
                    title: "Link",
                    widget: 'url',
                  },
                  title: {
                    title: "Title",
                  },
                  image: {
                    title: "Image",
                    widget: "image"
                  },
                  description: {
                    title: "Description",
                    widget: "slate"
                  },
                },
                required: [],
              },            
            },
          }
        }
      },
    }
  },  
};


import { initBridge } from './hydra.js';
const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video', 'slider'], customBlocks: customBlocks});
```

We have been given the following html which our frontend slider will have to adhere to.

``` html
<div class="slider">
  <div>
    <div class="slide">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b>hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide">
      ...
    </div>
  </div>
  <a link="">Prev></a><a link="">Next></a>
</div>
```

We can add this as a slide and sliler block to our block templates on the frontend and now our editors can add, remove slider blocks and the slides inside of them.
A detail sidebar UI for any "blocks" type allows for managing even complex composable blocks like a slider (TODO)

### Level 3: Enable Frontend block selection and Quanta Toolbar

This will enable an Editor to :-
- click directly on your block on the frontend preview to select it and edit the block settings in the sidebar. 
   - The block will be highlighted and a toolbar (called the quanta toolbar) will appear above it.
- selecting a block in the sidebar will highlight that block on the frontend

In your frontend insert the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most html element of the rendered block html.

So we modify our slider example 

``` html
<div class="slider" data-block-uid="....">
  <div>
    <div class="slide" data-block-uid="....">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b>hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide" data-block-uid="....">
      ...
    </div>
  </div>
  <a link="">Prev></a><a link="">Next></a>
</div>
```

Hydra.js will find these block markers and register click handlers and show a blue line around your blocks when selected.

If are using a 3rd party library to render a block and you can't change the markup then use 
the alternative [Comment systax](#comment-syntax) 

### Level 4: Enable Realtime changes while editing and preview Block controls

This will enable an Editor to:-
- Change page metadata and have blocks that depend on this like the "Title" block change.
- Change a block in the sidebar and have it change on the frontend even as you type
- Add and remove blocks in the sidebar and have them appear on the frontend preview
  - click on '+' Icon directly on the frontend to add a block after the current block. This will make the BlockChooser popup appear.
     - The '+' Icon appears outside the corner of the element with ```data-block-uid="<<BLOCK_UID>>>``` in the direction the block will be added.
  - remove a block via the Quanta toolbar dropdown
- drag and drop and cut, copy and paste on the preview ([TODO](https://github.com/collective/volto-hydra/issues/67))
- open or close the block settings [TODO](https://github.com/collective/volto-hydra/issues/81)
- multiple block selection to move, delete, or copy in bulk ([TODO](https://github.com/collective/volto-hydra/issues/104))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))

Note: For level 4 and beyond you need a frontend deployed as SPA or hybrid (rather than SSR or SSG). If your production deploy is
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
Since the data structure is that same as returned by the contents [RESTApi](https://6.docs.plone.org/plone.restapi/docs/source/index.html) it's normally easy to rerender your page dynamically using the same
code your frontend used to render the page previously.

These updates are sent frequently as the user makes changes in the sidebar but can adjust the frequency of updates for
performance reasons (TODO)

#### Container Blocks ([TODO](https://github.com/collective/volto-hydra/issues/99))

In the slider example we added a schema that included a special field type of "blocks". This renders a blocks widget in the sidebar and 
changes the container blocks json adding two attributes, 
```<fieldname>={<fieldid>={@type="..."}}``` and ```<fieldname>_layout=[<fieldid>,<fieldid>]```. 

On the frontend side just add the blockids of the subblocks as you would normally and hydra will make block selection, DND and adding
inside the container work for you. An add  button will be added after the current selected block.

Note
- Clicking on the frontend will always select the inner most nested block on desktop (and outer most on mobile)
- Desktop you can use sidebar, block toolbar or up key to select a parent (in cases there is no part of the container able to be clicked on)
- Mobile you click again to select the next inner child.


For our slider example

``` html
<div class="slider" data-block-uid="....">
  <div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b data-node-id="...">hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      ...
    </div>
  </div>
  <a data-block-selector="-1" link="">Prev></a>
  <a data-block-selector="+1" link="">Next></a>
</div>
```

- ```data-block-add="<<direction>>"``` is useful if blocks are going to be added in a non standard direction. By default it will alternate between 
  ```bottom``` and ```right``` depending on the parent container.
- You can use ```data-block-selector="<<block_uid>>>"``` on buttons or links anywhere to enable sidebar block selection. You can also use -1, +1 etc 
  to select the previous or next block.
- When a block is selected in the sidebar hydra will send fake clicks on  ```data-block-selector``` elements to ensure a hidden block is visible
   - but you can override this by setting a ```onHandleBlockSelection``` callback.


Placeholders are special blocks rendered when a container is empty or if a new sub-block is added.
- The  default placeholder has the @type of 'Placeholder'
- Render the Placeholder as taking up the space a typical sub-block might take up.
  - this is important so containers are always able to be selected even when empty.
- Hydra will automatically place an add button in the center of a Placeholder block.
- After the user clicks "add" and selects a block, the Placeholder is replaced by new block.
- if you'd like to customise the look of the placeholder you can use ```data-block-add="hidden"``` to prevent hide the default button
  and instead add ```data-block-add="button"``` to another element you want to act as the add button.
  - or you can nominate another type be your placeholder, such as a SlateBlock (which has the builtin capability to replace itself)
- if only one block type is allowed in a container then this is created instead of a Placeholder block.


### Level 5: Enable Visual frontend editing of Text, Media and links ([TODO](https://github.com/collective/volto-hydra/issues/5))

If you want to make the editing experience the most intuitive, you can enable real-time visual block editing, where an editor
can change text, links or media directly on your frontend page instead of via fields on the sidebar.

This is done using the ```data-editable-field="<<fieldname>>"``` and a widget specified in your schema will be used to allow
direct html changes in your frontend which are then sent back to the CMS and reflected in the settings in the sidebar.

``` html
<div class="slide" data-block-uid="....">
  <img data-editable-field="image" src="/big_news.jpg"/>
  <h2 data-editable-field="title">Big News</h2>
  <div data-editable-field="description">Check out <b>hydra</b>, it will change everything</div>
  <div><a data-editable-field="url" href="/big_news">Read more</a><div>
</div>
```

You might also want to edit content fields, in which case use ```data-editable-metdata``` ([TODO](https://github.com/collective/volto-hydra/issues/118)).
- Note: ```data-editable-metadata``` isn't required to be inside a block so can make fixed parts of the page editable.

``` html
<h2 data-editable-metdata="title">My Title</h2>
```

#### Visual Text editing

If the field is simple text (no slate widget) the this will enable an Editor to :-
- click into the rendered text on the frontend and type, adding, removing and cut and pasting.
- type a "/" shortcut to change an empty text block ([TODO](https://github.com/collective/volto-hydra/issues/34))
    - Using the enter key to split the block into two text blocks and backspace to join them ([TODO](https://github.com/collective/volto-hydra/issues/33))

If the widget is slate, then Editor can also :-
- select text to see what formatting has been applied and can be applied via buttons on the quanta toolbar
- select text and apply character styles (currently BOLD, ITALIC & STRIKETHROUGH)
- create or edit linked text.
- apply paragraph formatting ([TODO](https://github.com/collective/volto-hydra/issues/31))
- use markdown shortcuts like bullet and heading codes ([TODO](https://github.com/collective/volto-hydra/issues/105))
- paste rich text from the clipboard (TODO)
- and more ([TODO](https://github.com/collective/volto-hydra/issues/5))

For rich text (slate) you add ```data-editable-field``` to the html element contains the rich text but in addition you 
will also need insert ```data-node-id``` on each formatting element in your rendered slate text. This let's hydra.js
map your custom html to the internal data structure so formatting works as expected. (note these nodeids are only in 
data returned by ```onEditChange```)

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


#### Visual link editing ([TODO](https://github.com/collective/volto-hydra/issues/68))

This will enable an Editor to :-
- Click on a link or button on the frontend to set or change the link with either an external or internal url ([TODO](https://github.com/collective/volto-hydra/issues/68))
- Click on a link/button to optionally open the link in a new tab ([TODO](https://github.com/collective/volto-hydra/issues/111))

You might have a block with a link field like the Slide block. You can also make this visually
editable using ```data-editable-field```. In edit mode the click behaviour of that element will be altered and instead
the editor can pick content to link to, enter an external url of open the url in a separate tab.

### Level 6: Custom UI

#### Custom sidebar/CMS UI

If the autogenerated UI of the block or content schemas is not suitable there is an addon system for the React Volto framework
to override CMS components. This could be at a widget level, block settings level or even whole views like contents or site settings.
For example you might want to provide a special map editor.

- https://6.docs.plone.org/volto/blocks/editcomponent.html

Note: Volto is built as a monolith CMS framework so ignore that parts of the documentation that apply to the presentation layer.

#### Custom Visual Editing (TODO)
In some cases you might want to provide editors with more visual editing inside the preview than hydra currently supports. For example a newly created table block 
might display a form to set the initial number of columns and rows. In this case you can use
- ```sendBlockUpdate``` hydra.js api to send an updated version of the block after changes.
- ```sendBlockAction``` hydra.hs api to do actions like select,add, move, copy or remove blocks or perform custom actions on the Volto block edit component.
- You can disable hydra handling of selection, DND or other actions if you'd like to replace some parts of hydra and no others (TODO).

#### Custom API endpoints

With an open source headless CMS you have a choice between creating custom server side functionality as 
- a separately deployed microservice or 
- by [adding API endpoints as addons](https://2022.training.plone.org/mastering-plone/endpoints.html) to the backend api server. 


### Comment syntax ([TODO](https://github.com/collective/volto-hydra/issues/113))

If you can't easily modify the markup (for example using a 3rd party component library) you can use the alternative comment syntax to specify which elements are editable.
Use css selectors to specify which elements are editable. The selectors are applied just to the following element.

e.g.
``` html
<!-- hydra_block_uid:...; img:image; h2:title; .description:desc_field; div a:url  -->
<div class="slide">
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
3. On page setup it takes the path, does a [RESTAPI call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the json for this page
   - You can either use plone/client for this 
   - but in some frameworks, such as Nuxt.js, is better to use their inbuilt fetch.
   - You can also [Plone GraphQL api](https://2022.training.plone.org/gatsby/data.html) 
     - however note this is just a wrapper on the RESTAPI rather than a server side implementation so it's not more efficient than using the RESTAPI directly.
4. In your page template fill title etc from the content metadata
5. For navigation
   1. adjust the contents api call to use [@expand](https://6.docs.plone.org/volto/configuration/expanders.html) and return [navigation data](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) in the same call
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
   - In your component setup take the page and listing block json and do a [RESTAPI call to query the items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)
   - Render the items
   - Render the pagination
9.  Redirects
   1.  if your contents call results in a redirect then you will need also do an internal redirect in the framework so the path shown is correct
   2.  if you are using SSG then you will need to some special code to [query all the redirects](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/aliases.html#listing-all-available-aliases-via-json) at generate time add in redirect routes
10. Error Pages
    1.  If your [RESTAPI call returns an error](https://6.docs.plone.org/plone.restapi/docs/source/http-status-codes.html) you will need to handle this within the framework to display the error and set the status code
11. Search Blocks
    - if you choose to allow Voltos builtin Search Block for end user customisable search
    - you will need to render Facets/Filters (currently not as subblocks but this could change in the future)
    - build your query and do [RESTAPI call to query the items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html) 
12. Form Blocks
   - Form-block is a plugin that allows a visual form builder
   - Currently not a container with sub-blocks but this could change in the future
   - Render each field type component (or limit which are available)
   - Produce a compatible json submission to the form-block endpoint
   - handle field validation errors
   - handle thank you page

## Advanced

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

