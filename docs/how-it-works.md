# How Hydra Works

Instead of combining editing and rendering into one framework and codebase, these are separated. During editing, a two-way communication channel is opened across an iframe so that the editing UI is no longer part of the frontend code. Instead a small JS file called `hydra.js` is included in your frontend during editing that handles the iframe bridge communication to Hydra which is running in the same browser window. `hydra.js` also handles small parts of UI that need to be displayed on the frontend during editing.

You could think of it as splitting Volto into two parts — **Rendering** and **CMS UI/Admin UI** — while keeping the same editing interface, then making the Rendering part easily replaceable with other implementations.

## Architecture

```text
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

### Traditional Volto (top)

Both anonymous browsing and editing use the same Volto application, which communicates with Plone via REST API.

### Hydra Architecture (bottom)

- **Anonymous users** access the frontend directly, which fetches content from Plone's REST API
- **During editing**, the frontend loads `hydra.js` which opens an iframe bridge to the Hydra admin interface
- **Hydra admin** runs alongside the frontend in the same browser window, managing the editing UI (toolbar, sidebar, block management) while the frontend handles all rendering
- The **Plone server** serves both the frontend (content API) and Hydra (editing API)

This separation means:
- Your frontend can use any technology stack
- The editing experience is consistent regardless of frontend choice
- Frontend and CMS can be deployed and upgraded independently
