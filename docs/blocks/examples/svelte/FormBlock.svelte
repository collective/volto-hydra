<script>
  export let block;
</script>

<form data-block-uid={block['@uid']} class="form-block" on:submit|preventDefault>
  <h3 data-edit-text="title">{block.title}</h3>
  {#if block.description}
    <p data-edit-text="description">{block.description}</p>
  {/if}

  {#each block.subblocks || [] as field (field.field_id || field.id)}
    <div class="form-field" data-block-uid={field.field_id}>
      {#if field.field_type === 'text'}
        <label><span data-edit-text="label">{field.label}</span> <input type="text" required={field.required} /></label>
      {:else if field.field_type === 'textarea'}
        <label><span data-edit-text="label">{field.label}</span> <textarea required={field.required} /></label>
      {:else if field.field_type === 'number'}
        <label><span data-edit-text="label">{field.label}</span> <input type="number" required={field.required} /></label>
      {:else if field.field_type === 'from'}
        <label><span data-edit-text="label">{field.label}</span> <input type="email" required={field.required} /></label>
      {:else if field.field_type === 'date'}
        <label><span data-edit-text="label">{field.label}</span> <input type="date" required={field.required} /></label>
      {:else if field.field_type === 'checkbox'}
        <label><input type="checkbox" required={field.required} /> <span data-edit-text="label">{field.label}</span></label>
      {:else if field.field_type === 'select'}
        <label><span data-edit-text="label">{field.label}</span>
          <select required={field.required}>
            <option value="">Choose...</option>
            {#each field.input_values || [] as v}
              <option value={v}>{v}</option>
            {/each}
          </select>
        </label>
      {:else if field.field_type === 'single_choice'}
        <fieldset>
          <legend data-edit-text="label">{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="radio" name={field.field_id} value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'multiple_choice'}
        <fieldset>
          <legend data-edit-text="label">{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="checkbox" value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'static_text'}
        <p data-edit-text="label">{field.label}</p>
      {:else if field.field_type === 'hidden'}
        <input type="hidden" name={field.field_id} value={field.value || ''} />
      {:else if field.field_type === 'attachment'}
        <label><span data-edit-text="label">{field.label}</span> <input type="file" required={field.required} /></label>
      {:else}
        <label><span data-edit-text="label">{field.label}</span> <input type="text" /></label>
      {/if}
    </div>
  {/each}

  <button type="submit" data-edit-text="submit_label">{block.submit_label || 'Submit'}</button>
</form>
