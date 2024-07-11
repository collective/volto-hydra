'use client';
import React from 'react';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';

const SlateBlock = ({ value }) => {
  const editor = React.useMemo(
    () => withReact(withHistory(createEditor())),
    [],
  );
  const renderElement = ({ attributes, children, element }) => {
    console.log('element', element);
    if (element.type === 'link') {
      return (
        <a
          href={element.data.url}
          {...attributes}
          data-hydra-node={`${element?.nodeId}`}
        >
          {children}
        </a>
      );
    }

    const Tag = element.type;
    return (
      <Tag {...attributes} data-hydra-node={`${element?.nodeId}`}>
        {children}
      </Tag>
    );
  };

  const renderLeaf = ({ attributes, children }) => {
    console.log('attr', attributes);
    console.log('children', children);
    return (
      <span {...attributes} data-hydra-node={`${children.props.leaf?.nodeId}`}>
        {children}
      </span>
    );
  };

  const initialValue = value || [{ type: 'p', children: [{ text: '' }] }];
  editor.children = initialValue;
  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        readOnly
      />
    </Slate>
  );
};

export default SlateBlock;
