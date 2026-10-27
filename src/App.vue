<script setup>
/**
 * App.vue — page shell + shared cart/favorites state.
 *
 * reactive: one object Vue tracks for changes (cart + favorites).
 * When those change, Header badges and ProductCards update.
 *
 * Data down (props): App → Header, App → ProductList → ProductCard
 * Events up (emit):   ProductCard → ProductList → App
 *
 * Cart shape: { [productId]: quantity } — one entry per product.
 * Header count = sum of all quantities.
 */
import { reactive, computed } from "vue";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import ProductList from "@/components/ProductList.vue";
import { products } from "@/data/products.js";

const state = reactive({
  /** productId → how many of that product are in the cart */
  cart: {},
  /** Product ids marked as favorite (unique). */
  favoriteIds: [],
});

/** Total items in cart (sum of quantities). */
const cartCount = computed(() =>
  Object.values(state.cart).reduce((sum, qty) => sum + qty, 0),
);

/** First add: set quantity to 1. */
function addToCart(product) {
  state.cart[product.id] = 1;
}

function increaseCart(product) {
  state.cart[product.id] = (state.cart[product.id] ?? 0) + 1;
}

/** Decrease; remove the product when quantity hits 0. */
function decreaseCart(product) {
  const next = (state.cart[product.id] ?? 0) - 1;
  if (next <= 0) {
    delete state.cart[product.id];
  } else {
    state.cart[product.id] = next;
  }
}

/** Add id if missing, remove if already favorited. */
function toggleFavorite(product) {
  const index = state.favoriteIds.indexOf(product.id);
  if (index === -1) {
    state.favoriteIds.push(product.id);
  } else {
    state.favoriteIds.splice(index, 1);
  }
}
</script>

<template>
  <Header
    :cart-count="cartCount"
    :favorite-count="state.favoriteIds.length"
  />

  <main>
    <ProductList
      :products="products"
      :cart="state.cart"
      :favorites="state.favoriteIds"
      @add-to-cart="addToCart"
      @increase-cart="increaseCart"
      @decrease-cart="decreaseCart"
      @toggle-favorite="toggleFavorite"
    />
  </main>
  <Footer />
</template>
