<script setup>
/**
 * ActiveFilterChips — shows each selected filter as a removable chip,
 * plus a Clear all action. Parent owns the filter state; this only emits.
 *
 * The root always occupies a fixed one-row slot (even with zero chips).
 * Chips scroll horizontally inside that slot so the product grid never shifts.
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
    class="filter-chips"
    :class="{ 'filter-chips--empty': chips.length === 0 }"
    :aria-label="chips.length > 0 ? 'Active filters' : undefined"
    :aria-hidden="chips.length === 0 ? 'true' : undefined"
  >
    <template v-if="chips.length > 0">
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
    </template>
  </div>
</template>
