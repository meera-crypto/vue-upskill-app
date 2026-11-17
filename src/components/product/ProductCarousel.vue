<script setup>
/**
 * ProductCarousel — shared horizontal product row with overlay arrows.
 *
 * Used by Similar products and Recently viewed so both share the same
 * markup, CSS classes (`product-carousel__*`), and scroll behavior.
 *
 * Vue concepts:
 * - Default slot: parent renders each `<li class="product-carousel__item">`
 * - `watchKey` remeasures arrows when the list contents change
 * - `useHorizontalScroll` owns overflow state + arrow clicks
 */
import { computed, useTemplateRef, toRef } from "vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { useHorizontalScroll } from "@/composables/useHorizontalScroll.js";

const props = defineProps({
  /** Section heading text. */
  title: {
    type: String,
    required: true,
  },
  /** Unique id for the heading (aria-labelledby). */
  headingId: {
    type: String,
    required: true,
  },
  /** Accessible name for the scroll list. */
  listLabel: {
    type: String,
    required: true,
  },
  /**
   * Any value that changes when items change (e.g. product count).
   * Triggers a remeasure so arrows stay correct.
   */
  watchKey: {
    type: [String, Number, Boolean],
    default: 0,
  },
  /** Extra classes on the section (e.g. product-carousel--details). */
  sectionClass: {
    type: String,
    default: "",
  },
});

const scrollEl = useTemplateRef("scrollEl");
const watchKeyRef = toRef(props, "watchKey");

const {
  canOverflow,
  canScrollLeft,
  canScrollRight,
  scrollByDirection,
} = useHorizontalScroll(scrollEl, watchKeyRef);

const prevLabel = computed(() => `Scroll ${props.listLabel} left`);
const nextLabel = computed(() => `Scroll ${props.listLabel} right`);
</script>

<template>
  <section
    class="product-carousel"
    :class="sectionClass"
    :aria-labelledby="headingId"
  >
    <h2 :id="headingId" class="product-carousel__title">
      {{ title }}
    </h2>

    <div class="product-carousel__viewport">
      <ul
        ref="scrollEl"
        class="product-carousel__list"
        :aria-label="listLabel"
      >
        <slot />
      </ul>

      <button
        v-if="canOverflow && canScrollLeft"
        type="button"
        class="product-carousel__arrow product-carousel__arrow--prev"
        :aria-label="prevLabel"
        @click="scrollByDirection(-1)"
      >
        <ChevronLeft :size="20" aria-hidden="true" />
      </button>

      <button
        v-if="canOverflow && canScrollRight"
        type="button"
        class="product-carousel__arrow product-carousel__arrow--next"
        :aria-label="nextLabel"
        @click="scrollByDirection(1)"
      >
        <ChevronRight :size="20" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
