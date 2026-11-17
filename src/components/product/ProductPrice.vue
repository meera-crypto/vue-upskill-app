<script setup>
/**
 * ProductPrice — current price, optional original price, optional % off.
 *
 * Presentational only: parents compute `price` / discount flags and pass them in.
 * Keeps card and details pricing markup consistent.
 */
defineProps({
  price: {
    type: Number,
    required: true,
  },
  originalPrice: {
    type: Number,
    default: null,
  },
  showDiscount: {
    type: Boolean,
    default: false,
  },
  discountPercentLabel: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="product-card__pricing">
    <p class="product-card__price">${{ price.toFixed(2) }}</p>
    <p
      v-if="showDiscount && originalPrice != null"
      class="product-card__price product-card__price--original"
    >
      ${{ Number(originalPrice).toFixed(2) }}
    </p>
    <p v-if="discountPercentLabel" class="product-card__offer">
      {{ discountPercentLabel }}
    </p>
  </div>
</template>
