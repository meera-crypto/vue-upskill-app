<script setup>
/**
 * ProductPagination — page controls under the product grid.
 *
 * Result count (“Showing X–Y of Z”) lives in ProductList’s toolbar next to
 * the sort dropdown. This component only renders Prev / page numbers / Next.
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
  <nav class="pagination" aria-label="Product pagination">
    <div class="pagination__controls">
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
