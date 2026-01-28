import { Editor, Range, Transforms, Node } from 'slate';

/**
 * Hydra override: adds prospective inline element support for collapsed
 * selections (inserts node with ZWS so subsequent typing goes inside).
 */
export const _insertElement = (elementType) => (editor, data) => {
  if (editor.getSavedSelection()) {
    const selection = editor.selection || editor.getSavedSelection();

    const rangeRef = Editor.rangeRef(editor, selection);

    const res = Array.from(
      Editor.nodes(editor, {
        match: (n) => n.type === elementType,
        mode: 'highest',
        at: selection,
      }),
    );

    if (res.length) {
      const [, path] = res[0];
      Transforms.setNodes(
        editor,
        { data },
        {
          at: path ? path : null,
          match: path ? (n) => n.type === elementType : null,
        },
      );
    } else if (Range.isCollapsed(selection)) {
      // Prospective inline element: insert node with ZWS so typing goes inside
      Transforms.insertNodes(
        editor,
        { type: elementType, data, children: [{ text: '\u200B' }] },
        { at: selection },
      );
      // Position cursor inside the new element - search whole editor
      const [insertedEntry] = Editor.nodes(editor, {
        at: [],
        match: n => n.type === elementType && n.children?.[0]?.text === '\u200B',
        mode: 'lowest',
        reverse: true,
      });
      if (insertedEntry) {
        const [, insertedPath] = insertedEntry;
        // Position at offset 0 - restoreSlateSelection will handle ZWS for cursor
        Transforms.select(editor, { path: [...insertedPath, 0], offset: 0 });
        editor.setSavedSelection(editor.selection);
      }
      return true;
    } else {
      Transforms.wrapNodes(
        editor,
        { type: elementType, data },
        {
          split: true,
          at: selection,
          match: (node) => {
            return Node.string(node).length !== 0;
          },
        },
      );
    }

    const sel = JSON.parse(JSON.stringify(rangeRef.current));

    setTimeout(() => {
      Transforms.select(editor, sel);
      editor.setSavedSelection(sel);
    });

    return true;
  }

  return false;
};

export const _unwrapElement = (elementType) => (editor) => {
  const selection = editor.selection || editor.getSavedSelection();
  let [link] = Editor.nodes(editor, {
    at: selection,
    match: (node) => node?.type === elementType,
  });
  const isAtStart =
    selection.anchor.offset === 0 && selection.focus.offset === 0;

  if (!link && !isAtStart) return false;

  if (!link) {
    try {
      link = Editor.previous(editor, {
        at: selection.anchor.path,
      });
    } catch (ex) {
      link = [];
    }
  }

  const [, path] = link;
  const [start, end] = Editor.edges(editor, path);
  const range = { anchor: start, focus: end };

  const ref = Editor.rangeRef(editor, range);

  Transforms.select(editor, range);
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      Array.isArray(elementType)
        ? elementType.includes(n.type)
        : n.type === elementType,
    at: range,
  });

  const current = ref.current;
  ref.unref();

  return current;
};

export const _isActiveElement = (elementType) => (editor) => {
  const selection = editor.selection || editor.getSavedSelection();
  let found;
  try {
    found = Array.from(
      Editor.nodes(editor, {
        match: (n) => n.type === elementType,
        at: selection,
      }) || [],
    );
  } catch (e) {
    return false;
  }
  if (found.length) return true;

  if (selection) {
    const { path } = selection.anchor;
    const isAtStart =
      selection.anchor.offset === 0 && selection.focus.offset === 0;

    if (isAtStart) {
      try {
        found = Editor.previous(editor, {
          at: path,
        });
      } catch (ex) {
        found = [];
      }
      if (found && found[0] && found[0].type === elementType) {
        return true;
      }
    }
  }

  return false;
};

export const _getActiveElement =
  (elementType) =>
  (editor, direction = 'any') => {
    const selection = editor.selection || editor.getSavedSelection();
    let found = [];

    try {
      found = Array.from(
        Editor.nodes(editor, {
          match: (n) =>
            Array.isArray(elementType)
              ? elementType.includes(n.type)
              : n.type === elementType,
          at: selection,
        }),
      );
    } catch (e) {
      return null;
    }

    if (found.length) return found[0];

    if (!selection) return null;

    if (direction === 'any' || direction === 'backward') {
      const { path } = selection.anchor;
      const isAtStart =
        selection.anchor.offset === 0 && selection.focus.offset === 0;

      if (isAtStart) {
        let found;
        try {
          found = Editor.previous(editor, {
            at: path,
          });
        } catch (ex) {
          console.warn('Unable to find previous node', editor, path);
          return;
        }
        if (found && found[0] && found[0].type === elementType) {
          if (
            (Array.isArray(elementType) &&
              elementType.includes(found[0].type)) ||
            found[0].type === elementType
          ) {
            return found;
          }
        } else {
          return null;
        }
      }
    }

    if (direction === 'any' || direction === 'forward') {
      const { path } = selection.anchor;
      const isAtStart =
        selection.anchor.offset === 0 && selection.focus.offset === 0;

      if (isAtStart) {
        let found;
        try {
          found = Editor.next(editor, {
            at: path,
          });
        } catch (e) {
          console.warn('Unable to find next node', editor, path);
          return;
        }
        if (found && found[0] && found[0].type === elementType) {
          if (
            (Array.isArray(elementType) &&
              elementType.includes(found[0].type)) ||
            found[0].type === elementType
          ) {
            return found;
          }
        } else {
          return null;
        }
      }
    }

    return null;
  };
