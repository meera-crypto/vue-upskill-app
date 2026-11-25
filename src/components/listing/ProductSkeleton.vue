<script setup lang="ts">
/**
 * ProductSkeleton — placeholder cards while the listing loads.
 *
 * Vue idea: a presentational component with one prop (`count`). Parents
 * decide *when* to show it (`v-if="loading"`); this file only renders the
 * fake card shapes so layout space is reserved (less jump when data arrives).
 */
defineProps({
  /** How many placeholder cards to show (matches default page size: 12). */
  count: {
    type: Number,
    default: 12,
  },
});
</script>

<template>
  <ul
    class="product-list__grid product-skeleton"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading products"
  >
    <li
      v-for="n in count"
      :key="n"
      class="product-list__item"
      aria-hidden="true"
    >
      <div class="product-skeleton__card">
        <div class="product-skeleton__media" />
        <div class="product-skeleton__body">
          <div class="product-skeleton__line product-skeleton__line--brand" />
          <div class="product-skeleton__line product-skeleton__line--title" />
          <div class="product-skeleton__line product-skeleton__line--price" />
          <div class="product-skeleton__cta" />
        </div>
      </div>
    </li>
  </ul>
</template>
