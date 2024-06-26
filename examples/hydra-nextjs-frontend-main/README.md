# Next.js Example frontend for Volto Hydra

This provides instructions on integrating your frontend built with Next.js into the Volto Hydra decoupled editor for headless Plone.
Follow these steps to set up and run your frontend with Volto Hydra.

***Note:*** This example frontend uses already deployed [Volto Hydra Demo](https://hydra.pretagov.com/).
You can also set up your own local instance of Volto Hydra by following [this guide](https://github.com/collective/volto-hydra/?tab=readme-ov-file#test-your-frontend).

### Running the application

Start the development server:
```bash
npm run dev
```

### Deploying the frontend

We are using vercel to deploy our frontend which will automatically set up CI/CD as you go.
For more information on deployment, Follow [vercel guide](https://vercel.com/docs/getting-started-with-vercel).

### Editing your content using Volto Hydra

Once your frontend is deployed you can visit [the Demo site](https://hydra.pretagov.com/) or the local instance of Volto Hydra, login with demo username & password (mentioned in login page) and paste your frontend url in the adminUI (Volto Hydra).

Now, you can access private content and start editing!

**Follow and star the [Volto Hydra Repo](https://github.com/collective/volto-hydra) to know about latest features you can use.**

### Available Features:

List of currently working features of Volto Hydra and short explanation on how they are integrated:

#### Authenticating frontend to access private content

When you input your frontend URL at the Volto Hydra (adminUI) it will set 2 params in your frontend URL. You can extract the `access_token` parameter directly from the URL for the `ploneClient` token option.

Usage:
```js
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

#### Initiating Hydra Bridge for 2-way communication with Hydra

```js
  // In Layout.js
  import { initBridge } from './hydra.js';
  initBridge("https://hydra.pretagov.com");
```

#### Enabling Click on Blocks

You will add data attributes to your rendered block html so hydra knows where they are on the page and it
will automatically handle click events and show a quanta toolbar ([TODO](https://github.com/collective/volto-hydra/issues/25)) 
and border ([TODO](https://github.com/collective/volto-hydra/issues/24)) when selecting a block.
Without this, you can still manage blocks via the blocks navigation in the sidebar.

Usage:

```js
// components/BlockList
import React from "react";
import SlateBlock from "@/components/SlateBlock";

const BlocksList = ({ data }) => {
  return (
    <ul className="blog-list">
      {data.blocks_layout.items.map((id) => {
        if (data.blocks[id]["@type"] === "slate") {
          const slateValue = data.blocks[id].value;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <SlateBlock value={slateValue} />
            </li>
          );
        } else if (data.blocks[id]["@type"] === "image") {
          const image_url = data.blocks[id].url;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <img src={image_url} alt="" width={100} height={100} />
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
};

export default BlocksList;
```

#### Enable Realtime changes while editing

You will need to subscribe to an ```onEditChange``` event that will call the callback with the updated data.

The `onEditChange` method listens for changes in the Hydra and triggers a callback with updated data.
The 'data' object follows the same format as you get from the [ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

`onEditChange` takes following args:
| Args         | Description |
| :-----------:| :-------|
| *callback*   | A function to call with the updated data when a change is detected. |

Usage:

```js
  useEffect(() => {
    onEditChange((updatedData) => {
      if (updatedData) {
        setValue(updatedData);
      }
    });
  },[]);
```

