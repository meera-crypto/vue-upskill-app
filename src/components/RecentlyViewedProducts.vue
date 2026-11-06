<script setup>
/**
 * Recently viewed — product row using shared ProductCarousel.
 *
 * Vue concepts:
 * - Reads shared state from `useRecentlyViewed` (module-scope ref)
 * - Optional `excludeId` hides the product you're already viewing
 * - Owns cart / favorites / toast handlers so parents only drop it in
 * - Scroll / arrows / card layout come from ProductCarousel
 */
import { computed } from "vue";
import { useRouter } from "vue-router";
import ProductCard from "@/components/ProductCard.vue";
import ProductCarousel from "@/components/ProductCarousel.vue";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { useRecentlyViewed } from "@/composables/useRecentlyViewed.js";
import { useToast } from "@/composables/useToast.js";
import { productDetailsTo } from "@/utils/productRoutes.js";

const props = defineProps({
  /** Hide this product from the row (details page: current item). */
  excludeId: {
    type: [Number, String],
    default: null,
  },
  /** Extra class on the carousel section (e.g. product-carousel--details). */
  sectionClass: {
    type: String,
    default: "",
  },
});

const router = useRouter();
const toast = useToast();
const { cartQuantities, addToCart } = useCart();
const { isFavorite, toggleFavorite } = useFavorites();
const { recentlyViewed } = useRecentlyViewed();

const products = computed(() => {
  if (props.excludeId == null || props.excludeId === "") {
    return recentlyViewed.value;
  }
  return recentlyViewed.value.filter(
    (item) => String(item.id) !== String(props.excludeId),
  );
});

function productLabel(product) {
  return product?.title?.trim() || "Item";
}

function onAddToCart(product) {
  if (addToCart(product)) {
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
</script>

<template>
  <ProductCarousel
    v-if="products.length"
    title="Recently viewed"
    heading-id="recently-viewed-heading"
    list-label="Recently viewed products"
    :watch-key="products.length"
    :section-class="sectionClass"
  >
    <li
      v-for="item in products"
      :key="item.id"
      class="product-carousel__item"
    >
      <ProductCard
        :product="item"
        :favorited="isFavorite(item.id)"
        :quantity="cartQuantities[item.id] ?? 0"
        @add-to-cart="onAddToCart"
        @go-to-cart="onGoToCart"
        @toggle-favorite="onToggleFavorite"
        @see-all-options="onSeeAllOptions"
      />
    </li>
  </ProductCarousel>
</template>
