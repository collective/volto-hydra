<template>
  <form :data-block-uid="block['@uid']" class="form-block" @submit.prevent>
    <h3 data-edit-text="title">{{ block.title }}</h3>
    <p v-if="block.description" data-edit-text="description">{{ block.description }}</p>

    <div v-for="field in block.subblocks || []" :key="field['@id']" class="form-field" :data-block-uid="field.field_id">
      <template v-if="field.field_type === 'text'">
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="text" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'textarea'">
        <label><span data-edit-text="label">{{ field.label }}</span> <textarea :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'from'">
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="email" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'select'">
        <label><span data-edit-text="label">{{ field.label }}</span>
          <select :required="field.required">
            <option value="">Choose...</option>
            <option v-for="v in field.input_values || []" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
      </template>
      <template v-else-if="field.field_type === 'single_choice'">
        <fieldset>
          <legend data-edit-text="label">{{ field.label }}</legend>
          <label v-for="v in field.input_values || []" :key="v">
            <input type="radio" :name="field.field_id" :value="v" /> {{ v }}
          </label>
        </fieldset>
      </template>
      <template v-else-if="field.field_type === 'checkbox'">
        <label><input type="checkbox" :required="field.required" /> <span data-edit-text="label">{{ field.label }}</span></label>
      </template>
      <template v-else-if="field.field_type === 'static_text'">
        <p data-edit-text="label">{{ field.label }}</p>
      </template>
      <template v-else-if="field.field_type === 'hidden'">
        <input type="hidden" :name="field.field_id" :value="field.value" />
      </template>
      <template v-else>
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="text" :required="field.required" /></label>
      </template>
    </div>

    <button type="submit" data-edit-text="submit_label">{{ block.submit_label || 'Submit' }}</button>
  </form>
</template>

<script setup>
defineProps({ block: Object });
</script>
