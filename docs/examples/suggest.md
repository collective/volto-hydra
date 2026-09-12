# Suggest Block

A question whose answer is completed from a vocabulary the author picked.

This is a **custom** block — register it via `initBridge`.

**Demonstrates:** [Picking a vocabulary (`vocabularySelect`)](../custom-blocks.md#picking-a-vocabulary-vocabularyselect) — the author chooses *which* vocabulary in the sidebar; the frontend asks that vocabulary for matches as someone types.

Two halves, and they are different jobs:

- The **author** picks the vocabulary with the `vocabularySelect` widget. What is stored is a **name** (`plone.app.vocabularies.Keywords`), not a URL, so content carries no environment's origin. `vocabularyFilter` narrows the menu to the vocabularies that make sense for this question.
- The **visitor** types, and the frontend asks that vocabulary: `@vocabularies/<name>?title=<typed>`. The filter is applied **server-side**, which is what makes this work for a vocabulary of thousands of suburbs as well as one of five tags.

`@vocabularies` is readable anonymously (`zope2.View`), unlike `@sources` and `@querysources` (`plone.restapi.vocabularies`, Manager / Site Administrator) — so a **public** form may suggest from a vocabulary and may never suggest from a source.

The input is an ordinary text box: suggestions are an enhancement, so with no JavaScript someone types the answer and it submits unchanged.

## Schema

```json
{
  "suggest": {
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Question"
        },
        "suggestFrom": {
          "title": "Suggest from",
          "widget": "vocabularySelect",
          "vocabularyFilter": "Keywords|Subject"
        },
        "value": {
          "title": "Answer"
        }
      }
    }
  }
}
```


## JSON Block Data

## Rendering

### React

<!-- file: examples/react/SuggestBlock.jsx -->

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-block-uid` | Identifies the block for selection |
| `data-edit-text="label"` | Makes the question inline-editable |
