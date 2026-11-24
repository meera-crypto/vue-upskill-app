<script setup>
/**
 * ActiveFilterChips — shows each selected filter as a removable chip,
 * plus a Clear all action appended after the last chip.
 * Parent owns the filter state; this only emits.
 *
 * Clear all is the last item in the chip row (not pinned), so it sits
 * right after the final chip and scrolls with them when the row overflows.
 *
 * Vue idea: v-if removes the element from the DOM (and layout) when false.
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
      <li class="filter-chips__item filter-chips__item--clear">
        <button
          type="button"
          class="filter-chips__clear"
          @click="emit('clear')"
        >
          Clear all
        </button>
      </li>
    </ul>
  </div>
</template>
