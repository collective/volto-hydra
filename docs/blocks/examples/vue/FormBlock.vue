<template>
  <form :data-block-uid="block['@uid']" class="form-block" @submit.prevent>
    <h3>{{ block.title }}</h3>
    <p v-if="block.description">{{ block.description }}</p>

    <div v-for="field in block.subblocks || []" :key="field['@id']" class="form-field">
      <template v-if="field.field_type === 'text'">
        <label>{{ field.label }} <input type="text" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'textarea'">
        <label>{{ field.label }} <textarea :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'from'">
        <label>{{ field.label }} <input type="email" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'select'">
        <label>{{ field.label }}
          <select :required="field.required">
            <option value="">Choose...</option>
            <option v-for="v in field.input_values || []" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
      </template>
      <template v-else-if="field.field_type === 'single_choice'">
        <fieldset>
          <legend>{{ field.label }}</legend>
          <label v-for="v in field.input_values || []" :key="v">
            <input type="radio" :name="field.field_id" :value="v" /> {{ v }}
          </label>
        </fieldset>
      </template>
      <template v-else-if="field.field_type === 'checkbox'">
        <label><input type="checkbox" :required="field.required" /> {{ field.label }}</label>
      </template>
      <template v-else-if="field.field_type === 'static_text'">
        <p>{{ field.label }}</p>
      </template>
      <template v-else-if="field.field_type === 'hidden'">
        <input type="hidden" :name="field.field_id" :value="field.value" />
      </template>
      <template v-else>
        <label>{{ field.label }} <input type="text" :required="field.required" /></label>
      </template>
    </div>

    <button type="submit">{{ block.submit_label || 'Submit' }}</button>
  </form>
</template>

<script setup>
defineProps({ block: Object });
</script>
