<script setup>
/**
 * ProductList sits between App and ProductCard.
 *
 * - Receives products, cart, and favorites as props from App
 * - Passes `favorited` + `quantity` into each card
 * - Forwards cart / favorite events up to App
 */
import ProductCard from "@/components/ProductCard.vue";

const props = defineProps({
  products: {
    type: Array,
    required: true,
  },
  /** productId → quantity from App */
  cart: {
    type: Object,
    default: () => ({}),
  },
  /** Array of favorited product ids from App */
  favorites: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "add-to-cart",
  "increase-cart",
  "decrease-cart",
  "toggle-favorite",
]);

function isFavorite(productId) {
  return props.favorites.includes(productId);
}

function quantityFor(productId) {
  return props.cart[productId] ?? 0;
}
</script>

<template>
  <section class="product-list" aria-labelledby="product-list-heading">
    <div class="container">
      <h2 id="product-list-heading" class="product-list__heading">Products</h2>

      <ul class="product-list__grid">
        <li
          v-for="product in products"
          :key="product.id"
          class="product-list__item"
        >
          <ProductCard
            :product="product"
            :favorited="isFavorite(product.id)"
            :quantity="quantityFor(product.id)"
            @add-to-cart="emit('add-to-cart', $event)"
            @increase-cart="emit('increase-cart', $event)"
            @decrease-cart="emit('decrease-cart', $event)"
            @toggle-favorite="emit('toggle-favorite', $event)"
          />
        </li>
      </ul>
    </div>
  </section>
</template>
