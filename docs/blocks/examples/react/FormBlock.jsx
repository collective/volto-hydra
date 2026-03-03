function FormBlock({ block }) {
  const fields = block.subblocks || [];

  return (
    <form data-block-uid={block['@uid']} className="form-block" onSubmit={e => e.preventDefault()}>
      <h3 data-edit-text="title">{block.title}</h3>
      {block.description && <p data-edit-text="description">{block.description}</p>}

      {fields.map(field => (
        <FormField key={field['@id']} field={field} />
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
      return <label>{label} <input type="text" required={required} /></label>;
    case 'textarea':
      return <label>{label} <textarea required={required} /></label>;
    case 'number':
      return <label>{label} <input type="number" required={required} /></label>;
    case 'from':
      return <label>{label} <input type="email" required={required} /></label>;
    case 'date':
      return <label>{label} <input type="date" required={required} /></label>;
    case 'checkbox':
      return <label><input type="checkbox" required={required} /> {label}</label>;
    case 'select':
      return (
        <label>{label}
          <select required={required}>
            <option value="">Choose...</option>
            {(field.input_values || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      );
    case 'single_choice':
      return (
        <fieldset>
          <legend>{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="radio" name={field.field_id} value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'multiple_choice':
      return (
        <fieldset>
          <legend>{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="checkbox" value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'static_text':
      return <p>{label}</p>;
    case 'hidden':
      return <input type="hidden" name={field.field_id} value={field.value || ''} />;
    case 'attachment':
      return <label>{label} <input type="file" required={required} /></label>;
    default:
      return <label>{label} <input type="text" /></label>;
  }
}
