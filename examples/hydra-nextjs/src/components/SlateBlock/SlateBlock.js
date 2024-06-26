"use client";
import React from "react";
import { createEditor } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import { withHistory } from "slate-history";

const SlateBlock = ({ value }) => {
  const editor = React.useMemo(() => withReact(withHistory(createEditor())), []);
  const renderElement = ({ attributes, children, element }) => {
    if (element.type === "link") {
      return (
        <a href={element.data.url} {...attributes}>
          {children}
        </a>
      );
    }

    const Tag = element.type;
    return <Tag {...attributes}>{children}</Tag>;
  };

  const renderLeaf = ({ attributes, children }) => {
    return <span {...attributes}>{children}</span>;
  };

  const initialValue = value || [{ type: "p", children: [{ text: "" }] }];
  editor.children = initialValue;
  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable renderElement={renderElement} renderLeaf={renderLeaf} readOnly />
    </Slate>
  );
};

export default SlateBlock;
