<script setup>
/**
 * ProductPagination — modern page control under the product grid.
 *
 * Always uses the same “Showing X–Y of Z” summary layout.
 * Page controls only appear when there is more than one page.
 */
import { ChevronLeft, ChevronRight } from "@lucide/vue";

defineProps({
  page: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  range: {
    type: Object,
    required: true,
  },
  pageItems: {
    type: Array,
    required: true,
  },
  canPrev: {
    type: Boolean,
    default: false,
  },
  canNext: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["prev", "next", "go-to-page"]);
</script>

<template>
  <nav
    v-if="total > 0"
    class="pagination"
    :class="{ 'pagination--summary-only': totalPages <= 1 }"
    aria-label="Product pagination"
  >
    <p class="pagination__summary" aria-live="polite">
      Showing
      <span class="pagination__summary-strong"
        >{{ range.start }}–{{ range.end }}</span
      >
      of
      <span class="pagination__summary-strong">{{ total }}</span>
    </p>

    <div v-if="totalPages > 1" class="pagination__controls">
      <button
        type="button"
        class="pagination__nav"
        :disabled="!canPrev"
        aria-label="Previous page"
        @click="emit('prev')"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
        <span class="pagination__nav-label">Prev</span>
      </button>

      <ul class="pagination__pages">
        <li v-for="(item, index) in pageItems" :key="`${item}-${index}`">
          <span
            v-if="item === '…'"
            class="pagination__ellipsis"
            aria-hidden="true"
            >…</span
          >
          <button
            v-else
            type="button"
            class="pagination__page"
            :class="{ 'pagination__page--current': item === page }"
            :aria-label="`Page ${item}`"
            :aria-current="item === page ? 'page' : undefined"
            @click="emit('go-to-page', item)"
          >
            {{ item }}
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="pagination__nav"
        :disabled="!canNext"
        aria-label="Next page"
        @click="emit('next')"
      >
        <span class="pagination__nav-label">Next</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
