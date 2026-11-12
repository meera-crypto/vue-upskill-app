<script setup>
/**
 * Favorites page — products saved via the heart on product cards.
 *
 * Reuses ProductCard so Add to cart / unfavorite behave the same as on the
 * listing. State comes from shared useFavorites + useCart.
 */
import { computed } from "vue";
import { useRouter } from "vue-router";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import ProductCard from "@/components/ProductCard.vue";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { useToast } from "@/composables/useToast.js";
import { productDetailsTo } from "@/utils/productRoutes.js";

const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart } = useCart();
const { favoriteProducts, favoriteIds, favoriteCount, toggleFavorite } =
  useFavorites();

/** Products → Favorites (current page has no link). */
const breadcrumbItems = computed(() => [
  { label: "Products", to: { name: "products" } },
  { label: "Favorites" },
]);

function productLabel(product) {
  return product?.title?.trim() || "Item";
}

function onAddToCart(product, variant = null) {
  if (addToCart(product, 1, variant)) {
    toast.success(`${productLabel(product)} added to cart`);
  }
}

function onGoToCart() {
  router.push({ name: "cart" });
}

function onToggleFavorite(product) {
  const result = toggleFavorite(product);
  if (result === "added") {
    toast.favorite(`${productLabel(product)} added to favorites`);
  } else if (result === "removed") {
    toast.favorite(`${productLabel(product)} removed from favorites`);
  }
}

function onSeeAllOptions(product) {
  if (!product?.id) return;
  router.push(productDetailsTo(product));
}

function continueShopping() {
  router.push({ name: "products" });
}
</script>

<template>
  <!-- Header is in App.vue — shared across routes. -->
  <main class="favorites-page">
    <div class="container favorites-page__inner">
      <Breadcrumbs :items="breadcrumbItems" />

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
              @toggle-favorite="onToggleFavorite"
              @see-all-options="onSeeAllOptions"
            />
          </li>
        </ul>

        <div class="favorites-page__footer-actions">
          <button
            type="button"
            class="btn btn--secondary"
            @click="continueShopping"
          >
            Continue shopping
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
