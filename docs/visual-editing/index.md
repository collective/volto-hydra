# Visual Editing

Hydra provides a live preview of your frontend using an iframe in the middle of the screen. By adding simple optional levels of hints in your frontend code, Hydra will add overlays so visual drag-and-drop editing is enabled.

```text
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
│       │                                                                               │                               │
└───────┘───────────────────────────────────────────────────────────────────────────────└───────────────────────────────┘
```

## Integration Levels

Each level progressively adds more visual editing capabilities:

- **No integration** — the preview frontend tracks CMS navigation and refreshes after save
- **Level 1** — tracks frontend to navigate to change CMS context to quickly edit the current page including private pages
- **Level 2** — allows your frontend to define custom content types and block types
- **Level 3** — allows you to select blocks inside this preview but not see any changes
- **Level 4** — allows you to see changes in realtime and lets you manage blocks
- **Level 5** — lets the user edit text, images and links directly on the preview
- **Level 6** — if needed, customise CMS UI or more complex visual editing in the frontend

```{toctree}
:maxdepth: 1

level-0-headless
level-1-bridge
level-2-blocks
level-3-selection
level-4-realtime
level-5-direct-edit
level-6-custom
```
