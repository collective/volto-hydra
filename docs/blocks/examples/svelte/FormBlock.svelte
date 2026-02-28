<script>
  export let block;
</script>

<form data-block-uid={block['@uid']} class="form-block" on:submit|preventDefault>
  <h3>{block.title}</h3>
  {#if block.description}
    <p>{block.description}</p>
  {/if}

  {#each block.subblocks || [] as field (field['@id'])}
    <div class="form-field">
      {#if field.field_type === 'text'}
        <label>{field.label} <input type="text" required={field.required} /></label>
      {:else if field.field_type === 'textarea'}
        <label>{field.label} <textarea required={field.required} /></label>
      {:else if field.field_type === 'number'}
        <label>{field.label} <input type="number" required={field.required} /></label>
      {:else if field.field_type === 'from'}
        <label>{field.label} <input type="email" required={field.required} /></label>
      {:else if field.field_type === 'date'}
        <label>{field.label} <input type="date" required={field.required} /></label>
      {:else if field.field_type === 'checkbox'}
        <label><input type="checkbox" required={field.required} /> {field.label}</label>
      {:else if field.field_type === 'select'}
        <label>{field.label}
          <select required={field.required}>
            <option value="">Choose...</option>
            {#each field.input_values || [] as v}
              <option value={v}>{v}</option>
            {/each}
          </select>
        </label>
      {:else if field.field_type === 'single_choice'}
        <fieldset>
          <legend>{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="radio" name={field.field_id} value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'multiple_choice'}
        <fieldset>
          <legend>{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="checkbox" value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'static_text'}
        <p>{field.label}</p>
      {:else if field.field_type === 'hidden'}
        <input type="hidden" name={field.field_id} value={field.value || ''} />
      {:else if field.field_type === 'attachment'}
        <label>{field.label} <input type="file" required={field.required} /></label>
      {:else}
        <label>{field.label} <input type="text" /></label>
      {/if}
    </div>
  {/each}

  <button type="submit">{block.submit_label || 'Submit'}</button>
</form>
