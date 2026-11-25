<script setup lang="ts">
/**
 * Breadcrumbs — shared trail for Favorites, Cart, and Product details.
 *
 * Vue concepts:
 * - `items` prop: array of `{ label, to? }`
 * - items with `to` render as RouterLink; the last item is the current page
 * - Parents build the trail; this component only renders it
 *
 *
 */
import type { PropType } from "vue";
import type { BreadcrumbItem } from "@/types/ui";

defineProps({
  items: {
    type: Array as PropType<BreadcrumbItem[]>,
    required: true,
    validator(value: BreadcrumbItem[]) {
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.label === "string" &&
            item.label.trim().length > 0,
        )
      );
    },
  },
});
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumbs__list">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        :aria-current="index === items.length - 1 ? 'page' : undefined"
      >
        <RouterLink v-if="item.to && index < items.length - 1" :to="item.to">
          {{ item.label }}
        </RouterLink>
        <span v-else>{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
