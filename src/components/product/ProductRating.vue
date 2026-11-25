<script setup lang="ts">
/**
 * ProductRating — star badge + score + optional review count.
 *
 * Only render this when the parent already knows a real rating exists
 * (never invent stars). `tone` maps to shared `.rating-badge--*` colors.
 * `size="lg"` is used on product details for a slightly larger badge.
 */
import type { PropType } from "vue";

defineProps({
  rating: {
    type: Number,
    required: true,
  },
  reviewCount: {
    type: Number as PropType<number | null>,
    default: null,
  },
  tone: {
    type: String as PropType<string | null>,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "md",
    validator: (value: string) => ["md", "lg"].includes(value),
  },
});
</script>

<template>
  <p
    class="rating-badge"
    :class="[
      size === 'lg' ? 'rating-badge--lg' : undefined,
      tone ? `rating-badge--${tone}` : undefined,
    ]"
    :aria-label="label"
  >
    <slot name="icon" />
    <span class="rating-badge__score">
      {{ rating.toFixed(1) }}
    </span>
    <span v-if="reviewCount" class="rating-badge__count">
      ({{ reviewCount }})
    </span>
  </p>
</template>
