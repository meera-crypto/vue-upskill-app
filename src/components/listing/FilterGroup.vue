<script setup>
/**
 * FilterGroup — one collapsible filter accordion section.
 *
 * Vue ideas:
 * - `open` is controlled by the parent (FilterSidebar) so several sections
 *   can stay open at once via a reactive map.
 * - Default slot = panel body (checkboxes, sliders, swatches).
 */
import { ChevronDown } from "@lucide/vue";

defineProps({
  /** Visible section title (e.g. Brand). */
  title: {
    type: String,
    required: true,
  },
  /** Stable id fragment for aria-controls / heading ids. */
  sectionId: {
    type: String,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
  /** Selected-count badge; hidden when 0. */
  count: {
    type: Number,
    default: 0,
  },
});

defineEmits(["toggle"]);
</script>

<template>
  <section class="filter-group">
    <h3 class="filter-group__heading">
      <button
        type="button"
        class="filter-group__toggle"
        :aria-expanded="open"
        :aria-controls="`filter-panel-${sectionId}`"
        :id="`filter-${sectionId}-heading`"
        @click="$emit('toggle')"
      >
        <span class="filter-group__toggle-label">
          {{ title }}
          <span v-if="count" class="filter-group__count">
            {{ count }}
          </span>
        </span>
        <ChevronDown
          class="filter-group__chevron"
          :class="{ 'filter-group__chevron--open': open }"
          :size="20"
          aria-hidden="true"
        />
      </button>
    </h3>
    <div
      v-show="open"
      :id="`filter-panel-${sectionId}`"
      class="filter-group__panel"
      role="region"
      :aria-labelledby="`filter-${sectionId}-heading`"
    >
      <slot />
    </div>
  </section>
</template>
