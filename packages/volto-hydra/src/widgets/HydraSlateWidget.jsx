/**
 * Slate widget wrapper that registers the editor instance for Hydra iframe access
 */

import React from 'react';
import isUndefined from 'lodash/isUndefined';
import isString from 'lodash/isString';
import { FormFieldWrapper } from '@plone/volto/components/manage/Widgets';
import SlateEditor from '@plone/volto-slate/editor/SlateEditor';
import { createEmptyParagraph, createParagraph } from '@plone/volto-slate/utils/blocks';

import '@plone/volto-slate/widgets/style.css';

const getValue = (value) => {
  if (isUndefined(value) || !isUndefined(value?.data)) {
    return [createEmptyParagraph()];
  }
  // Previously this was a text field
  if (isString(value)) {
    return [createParagraph(value)];
  }
  return value;
};

// Extended SlateEditor that registers its editor instance in window.voltoHydraSidebarEditors
class HydraSlateEditor extends SlateEditor {
  componentDidMount() {
    super.componentDidMount();

    // Register this editor instance for Hydra iframe access
    if (typeof window !== 'undefined') {
      if (!window.voltoHydraSidebarEditors) {
        window.voltoHydraSidebarEditors = new Map();
      }
      const fieldId = this.props.id || this.props.name;
      console.log('[HYDRA] Registering sidebar editor for field:', fieldId);
      window.voltoHydraSidebarEditors.set(fieldId, this.state.editor);
    }
  }

  componentWillUnmount() {
    // Unregister this editor instance
    if (typeof window !== 'undefined' && window.voltoHydraSidebarEditors) {
      const fieldId = this.props.id || this.props.name;
      console.log('[HYDRA] Unregistering sidebar editor for field:', fieldId);
      window.voltoHydraSidebarEditors.delete(fieldId);
    }

    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
  }
}

const HydraSlateWidget = (props) => {
  const {
    id,
    onChange,
    value,
    focus,
    className,
    block,
    placeholder,
    properties,
    readOnly = false,
  } = props;
  const [selected, setSelected] = React.useState(focus);

  return (
    <FormFieldWrapper {...props} draggable={false} className="slate_wysiwyg">
      <div
        className="slate_wysiwyg_box"
        role="textbox"
        tabIndex="-1"
        style={{ boxSizing: 'initial' }}
        onClick={() => {
          setSelected(true);
        }}
        onKeyDown={() => {}}
      >
        <HydraSlateEditor
          className={className}
          readOnly={readOnly}
          id={id}
          name={id}
          value={getValue(value)}
          onChange={(newValue) => {
            onChange(id, newValue);
          }}
          block={block}
          selected={selected}
          properties={properties}
          placeholder={placeholder}
        />
      </div>
    </FormFieldWrapper>
  );
};

export default HydraSlateWidget;
