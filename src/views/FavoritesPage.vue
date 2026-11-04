<script setup>
/**
 * Favorites page — products saved via the heart on product cards.
 *
 * Reuses ProductCard so Add to cart / Buy now / unfavorite behave the same
 * as on the listing. State comes from shared useFavorites + useCart.
 */
import { useRouter } from "vue-router";
import ProductCard from "@/components/ProductCard.vue";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { useToast } from "@/composables/useToast.js";

const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart, buyNow } = useCart();
const { favoriteProducts, favoriteIds, favoriteCount, toggleFavorite } =
  useFavorites();

function productLabel(product) {
  return product?.title?.trim() || "Item";
}

function onAddToCart(product) {
  if (addToCart(product)) {
    toast.success(`${productLabel(product)} added to cart`);
  }
}

function onBuyNow(product) {
  const wasNew = !cartQuantities.value[product.id];
  if (!buyNow(product)) return;
  if (wasNew) {
    toast.success(`${productLabel(product)} added to cart`);
  }
  router.push({ name: "cart" });
}

function onGoToCart() {
  router.push({ name: "cart" });
}

function onToggleFavorite(product) {
  const result = toggleFavorite(product);
  if (result === "added") {
    toast.info(`${productLabel(product)} added to favorites`);
  } else if (result === "removed") {
    toast.info(`${productLabel(product)} removed from favorites`);
  }
}

function continueShopping() {
  router.push({ name: "products" });
}
</script>

<template>
  <!-- Header is in App.vue — shared across routes. -->
  <main class="favorites-page">
    <div class="container favorites-page__inner">
      <header class="favorites-page__header">
        <h1 class="favorites-page__title">Favorites</h1>
        <p v-if="favoriteCount > 0" class="favorites-page__count">
          {{ favoriteCount }}
          {{ favoriteCount === 1 ? "saved item" : "saved items" }}
        </p>
      </header>

      <div v-if="favoriteProducts.length === 0" class="favorites-page__empty">
        <p class="favorites-page__empty-text">
          No favorites yet. Tap the heart on a product to save it here.
        </p>
        <button
          type="button"
          class="btn btn--primary"
          @click="continueShopping"
        >
          Browse products
        </button>
      </div>

      <template v-else>
        <ul class="favorites-page__grid" aria-label="Favorite products">
          <li
            v-for="product in favoriteProducts"
            :key="product.id"
            class="favorites-page__item"
          >
            <ProductCard
              :product="product"
              :favorited="favoriteIds.includes(product.id)"
              :quantity="cartQuantities[product.id] ?? 0"
              @add-to-cart="onAddToCart"
              @go-to-cart="onGoToCart"
              @buy-now="onBuyNow"
              @toggle-favorite="onToggleFavorite"
            />
          </li>
        </ul>

        <div class="favorites-page__footer-actions">
          <button
            type="button"
            class="btn btn--primary"
            @click="continueShopping"
          >
            Continue shopping
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
