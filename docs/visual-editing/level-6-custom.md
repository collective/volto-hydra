# Level 6: Custom UI

## Custom Sidebar / CMS UI

If the auto-generated sidebar UI of the block or content schemas is not suitable, there is an addon system for the React Volto framework to override CMS components. This could be at a widget level, block settings level or even whole views like contents or site settings. For example, you might want to provide a special map editor.

- [Volto Block Edit Component Docs](https://6.docs.plone.org/volto/blocks/editcomponent.html)

```{note}
Volto is built as a monolith CMS framework so ignore the parts of the documentation that apply to the presentation layer.
```

## Custom Visual Editing (TODO)

In some cases you might want to provide editors with more visual editing inside the preview than Hydra currently supports. For example, a newly created table block might display a form to set the initial number of columns and rows. In this case you can use:

- `sendBlockUpdate` — hydra.js API to send an updated version of the block after changes (TODO)
- `sendBlockAction` — hydra.js API to do actions like select, add, move, copy or remove blocks or perform custom actions on the Volto block edit component
- You can disable Hydra handling of selection, DnD or other actions if you'd like to replace some parts of Hydra and not others (TODO)

## Custom API Endpoints

With an open source headless CMS you have a choice between creating custom server-side functionality as:

- A separately deployed microservice, or
- By [adding API endpoints as addons](https://2022.training.plone.org/mastering-plone/endpoints.html) to the backend API server
