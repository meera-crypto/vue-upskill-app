<script setup lang="ts">
/**
 * Favorites page — products saved via the heart on product cards.
 *
 * Reuses ProductCard so Add to cart matches the listing.
 * Cards use `favoriteAsClose` so remove is a × close control (not a heart).
 * State comes from shared useWishlist + useCart.
 */
import { computed } from "vue";
import type { Product, ProductVariant } from "@/types/product";
import { useRouter } from "vue-router";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import EmptyState from "@/components/listing/EmptyState.vue";
import ProductCard from "@/components/product/ProductCard.vue";
import { useCart } from "@/composables/useCart";
import { useWishlist } from "@/composables/useWishlist";
import { useToast } from "@/composables/useToast";
import { productDetailsTo } from "@/utils/productRoutes";

const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart } = useCart();
const { favoriteProducts, favoriteIds, favoriteCount, toggleFavorite } =
  useWishlist();

/** Single crumb for this top-level page (current page has no link). */
const breadcrumbItems = computed(() => [{ label: "Favorites" }]);

function productLabel(product: Product | null | undefined) {
  return product?.title?.trim() || "Item";
}

function onAddToCart(product: Product, variant: ProductVariant | null = null) {
  if (addToCart(product, 1, variant)) {
    toast.success(`${productLabel(product)} added to cart`);
    return;
  }
  toast.error(`Couldn't add ${productLabel(product)} to cart`);
}

function onGoToCart() {
  router.push({ name: "cart" });
}

function onToggleFavorite(product: Product) {
  const result = toggleFavorite(product);
  if (result === "added") {
    toast.favorite(`${productLabel(product)} added to favorites`);
  } else if (result === "removed") {
    toast.favorite(`${productLabel(product)} removed from favorites`);
  }
}

function onSeeAllOptions(product: Product) {
  if (!product?.id) return;
  router.push(productDetailsTo(product));
}

function continueShopping() {
  router.push({ name: "products" });
}
</script>

<template>
  <!-- Header / <main> are in App.vue — shared across routes. -->
  <div class="favorites-page">
    <div class="container favorites-page__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <header class="favorites-page__header">
        <h1 class="favorites-page__title">Favorites</h1>
        <p v-if="favoriteCount > 0" class="favorites-page__count">
          {{ favoriteCount }}
          {{ favoriteCount === 1 ? "saved item" : "saved items" }}
        </p>
      </header>

      <EmptyState
        v-if="favoriteProducts.length === 0"
        message="No favorites yet. Tap the heart on a product to save it here."
      >
        <template #actions>
          <button
            type="button"
            class="btn btn--primary"
            @click="continueShopping"
          >
            Browse products
          </button>
        </template>
      </EmptyState>

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
              favorite-as-close
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
  </div>
</template>

<style>
@import "@/assets/styles/components/favorites-page.css";
</style>
