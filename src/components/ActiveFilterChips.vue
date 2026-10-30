<script setup>
/**
 * ActiveFilterChips — shows each selected filter as a removable chip,
 * plus a Clear all action. Parent owns the filter state; this only emits.
 */
defineProps({
  chips: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["remove", "clear"]);
</script>

<template>
  <div
    v-if="chips.length > 0"
    class="filter-chips"
    aria-label="Active filters"
  >
    <ul class="filter-chips__list">
      <li v-for="chip in chips" :key="chip.id" class="filter-chips__item">
        <button
          type="button"
          class="filter-chips__chip"
          :aria-label="`Remove filter ${chip.label}`"
          @click="emit('remove', chip)"
        >
          <span>{{ chip.label }}</span>
          <span class="filter-chips__remove" aria-hidden="true">×</span>
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="filter-chips__clear"
      @click="emit('clear')"
    >
      Clear all
    </button>
  </div>
</template>
