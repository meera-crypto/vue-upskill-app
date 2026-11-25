<script setup lang="ts">
/**
 * Hero — home-page banner above the product list (all breakpoints).
 * Used on `/` only; category pages use `CategoryBanner.vue` instead.
 *
 * Below the title/CTA sits a primary-colored promo strip that highlights
 * one category (with its own description + tags) and shows a sample product.
 *
 * Vue concepts:
 * - defineProps() — parent can customize hero + banner copy.
 * - useProducts() — shared catalog (same module-scoped refs as the listing).
 * - computed() — pick category + product whenever the catalog changes.
 * - RouterLink — SPA navigation without a full page reload.
 *
 * Click targets: a stretched category link covers the whole banner;
 * the product link sits above it (higher z-index) so product clicks
 * still open details. HTML forbids nesting <a> inside <a>, so we
 * keep the two links as siblings instead.
 */
import { computed } from "vue";
import type { PropType } from "vue";
import { RouterLink } from "vue-router";
import { useProducts } from "@/composables/useProducts";
import { PRODUCT_IMAGE_FALLBACK } from "@/utils/productModel";
import { listingTo } from "@/utils/listingRoutes";
import { productDetailsTo } from "@/utils/productRoutes";

defineProps({
  title: {
    type: String,
    default: "Everyday essentials, chosen well",
  },
  description: {
    type: String,
    default:
      "From beauty and home to tech and style — explore curated picks with clear pricing, ratings, and stock you can trust.",
  },
  ctaLabel: {
    type: String,
    default: "Start shopping",
  },
  ctaHref: {
    type: String,
    default: "#products",
  },
  /** Short promo blurb for the primary category banner (not the product). */
  bannerDescription: {
    type: String,
    default:
      "Glow-ready picks for everyday routines — skincare, makeup, and fragrance chosen for clear pricing and trusted ratings.",
  },
  /** Promo tags shown on the category banner. */
  bannerTags: {
    type: Array as PropType<string[]>,
    default: () => ["Skincare", "Makeup", "Fragrance", "Self-care"],
  },
});

const { catalog } = useProducts();

/** Prefer a stable spotlight category when it exists in the catalog. */
const PREFERRED_CATEGORY = "beauty";

/**
 * One category to highlight in the promo strip.
 * Falls back to the first product's category if "beauty" is missing.
 */
const featuredCategory = computed(() => {
  const products = catalog.value;
  if (!products.length) return null;

  const preferred = products.find(
    (product) => product?.category === PREFERRED_CATEGORY,
  );
  const source = preferred ?? products[0];
  if (!source?.category) return null;

  return {
    value: source.category,
    label: source.categoryLabel || source.category,
  };
});

/** One product from the highlighted category (end of the banner). */
const featuredProduct = computed(() => {
  const category = featuredCategory.value?.value;
  if (!category) return null;

  return (
    catalog.value.find((product) => product?.category === category) ?? null
  );
});

const featuredCategoryTo = computed(() => {
  const value = featuredCategory.value?.value;
  return value ? listingTo({ category: value }) : listingTo();
});

const featuredProductTo = computed(() => {
  const product = featuredProduct.value;
  return product ? productDetailsTo(product) : null;
});

const featuredProductImage = computed(() => {
  const product = featuredProduct.value;
  if (!product) return PRODUCT_IMAGE_FALLBACK;
  return product.thumbnail || product.image || PRODUCT_IMAGE_FALLBACK;
});
</script>

<template>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="container hero__inner">
      <div>
        <h1 id="hero-heading" class="hero__title">{{ title }}</h1>
        <p class="hero__description">{{ description }}</p>
        <a :href="ctaHref" class="btn btn--primary hero__cta">{{ ctaLabel }}</a>
      </div>

      <aside
        v-if="featuredCategory && featuredProduct && featuredProductTo"
        class="hero-banner"
        aria-label="Featured category"
      >
        <!-- Stretched category hit-area (whole banner except the product). -->
        <RouterLink class="hero-banner__category-link" :to="featuredCategoryTo">
          <span class="visually-hidden">Shop {{ featuredCategory.label }}</span>
        </RouterLink>

        <div class="hero-banner__copy">
          <p class="hero-banner__eyebrow">Featured category</p>
          <p class="hero-banner__category">{{ featuredCategory.label }}</p>
          <p v-if="bannerDescription" class="hero-banner__description">
            {{ bannerDescription }}
          </p>
          <ul
            v-if="bannerTags.length"
            class="hero-banner__tags"
            aria-label="Banner tags"
          >
            <li v-for="tag in bannerTags" :key="tag" class="hero-banner__tag">
              {{ tag }}
            </li>
          </ul>
        </div>

        <RouterLink
          class="hero-banner__product"
          :to="featuredProductTo"
          :aria-label="`View ${featuredProduct.title}`"
        >
          <img
            class="hero-banner__product-image"
            :src="featuredProductImage"
            :alt="featuredProduct.title"
            width="72"
            height="72"
            loading="lazy"
            decoding="async"
          />
          <div class="hero-banner__product-meta">
            <p class="hero-banner__product-brand" v-if="featuredProduct.brand">
              {{ featuredProduct.brand }}
            </p>
            <p class="hero-banner__product-title">
              {{ featuredProduct.title }}
            </p>
            <p class="hero-banner__product-price">
              ${{ Number(featuredProduct.price).toFixed(2) }}
            </p>
          </div>
        </RouterLink>
      </aside>
    </div>
  </section>
</template>
