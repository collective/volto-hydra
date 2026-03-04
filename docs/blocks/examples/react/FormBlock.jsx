function FormBlock({ block }) {
  const fields = block.subblocks || [];

  return (
    <form data-block-uid={block['@uid']} className="form-block" onSubmit={e => e.preventDefault()}>
      <h3 data-edit-text="title">{block.title}</h3>
      {block.description && <p data-edit-text="description">{block.description}</p>}

      {fields.map(field => (
        <div key={field['@id']} data-block-uid={field.field_id} className="form-field">
          <FormField field={field} />
        </div>
      ))}

      <button type="submit">{block.submit_label || 'Submit'}</button>
    </form>
  );
}

function FormField({ field }) {
  const label = field.label || '';
  const required = field.required || false;

  switch (field.field_type) {
    case 'text':
      return <label><span data-edit-text="label">{label}</span> <input type="text" required={required} /></label>;
    case 'textarea':
      return <label><span data-edit-text="label">{label}</span> <textarea required={required} /></label>;
    case 'number':
      return <label><span data-edit-text="label">{label}</span> <input type="number" required={required} /></label>;
    case 'from':
      return <label><span data-edit-text="label">{label}</span> <input type="email" required={required} /></label>;
    case 'date':
      return <label><span data-edit-text="label">{label}</span> <input type="date" required={required} /></label>;
    case 'checkbox':
      return <label><input type="checkbox" required={required} /> <span data-edit-text="label">{label}</span></label>;
    case 'select':
      return (
        <label><span data-edit-text="label">{label}</span>
          <select required={required}>
            <option value="">Choose...</option>
            {(field.input_values || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      );
    case 'single_choice':
      return (
        <fieldset>
          <legend data-edit-text="label">{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="radio" name={field.field_id} value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'multiple_choice':
      return (
        <fieldset>
          <legend data-edit-text="label">{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="checkbox" value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'static_text':
      return <p data-edit-text="label">{label}</p>;
    case 'hidden':
      return <input type="hidden" name={field.field_id} value={field.value || ''} />;
    case 'attachment':
      return <label><span data-edit-text="label">{label}</span> <input type="file" required={required} /></label>;
    default:
      return <label><span data-edit-text="label">{label}</span> <input type="text" /></label>;
  }
}
