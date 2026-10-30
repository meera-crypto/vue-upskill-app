<script setup>
/**
 * SortDropdown — labeled <select> for the product listing toolbar.
 *
 * Vue ideas:
 * - `defineModel` — two-way bind the selected sort value to the parent
 *   (parent writes `v-model="filters.sort"`; this component emits updates)
 * - Props for the option list so the composable owns the allowed values
 */
defineProps({
  options: {
    type: Array,
    required: true,
  },
});

const model = defineModel({
  type: String,
  required: true,
});
</script>

<template>
  <div class="sort-dropdown">
    <label class="sort-dropdown__label" for="product-sort">Sort by</label>
    <select
      id="product-sort"
      class="sort-dropdown__select"
      v-model="model"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
