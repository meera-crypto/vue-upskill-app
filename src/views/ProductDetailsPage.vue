<script setup>
/**
 * Product details — one product at `/:category/:slug` (e.g. `/gadgets/iphone-x`).
 *
 * Vue concepts:
 * - Thin view: fetch + URL sync + wire child components / composables
 * - `useVariantSelection` shared with Quick View for option / SKU state
 * - Gallery, purchase panel, and reviews are presentational children
 */
import { computed, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import EmptyState from "@/components/listing/EmptyState.vue";
import ProductCard from "@/components/product/ProductCard.vue";
import ProductCarousel from "@/components/product/ProductCarousel.vue";
import ProductCompare from "@/components/product/ProductCompare.vue";
import ProductGallery from "@/components/product/ProductGallery.vue";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel.vue";
import ProductReviews from "@/components/product/ProductReviews.vue";
import RecentlyViewedProducts from "@/components/product/RecentlyViewedProducts.vue";
import { useProductDetail } from "@/composables/useProductDetail.js";
import { useProducts } from "@/composables/useProducts.js";
import { useCart } from "@/composables/useCart.js";
import { useWishlist } from "@/composables/useWishlist.js";
import { useRecentlyViewed } from "@/composables/useRecentlyViewed.js";
import { useToast } from "@/composables/useToast.js";
import { useVariantSelection } from "@/composables/useVariantSelection.js";
import {
  productDetailsTo,
  selectedOptionsFromNavigation,
} from "@/utils/productRoutes.js";
import { resolveStorefrontCategory } from "@/utils/categoryGroups.js";
import { getComparableProducts } from "@/utils/compareProducts.js";
import {
  getSimilarProducts,
  similarProductsListingTo,
} from "@/utils/similarProducts.js";

/** Max cards in the horizontal similar row before “View all”. */
const SIMILAR_PREVIEW_LIMIT = 8;

const route = useRoute();
const router = useRouter();
const toast = useToast();

const productSlug = computed(() => {
  const raw = route.params.slug;
  return Array.isArray(raw) ? raw[0] : raw;
});
const legacyProductId = computed(() => route.query.id);

const { product, loading, error, notFound, retry } = useProductDetail(
  productSlug,
  { legacyIdSource: legacyProductId },
);

const { trackView } = useRecentlyViewed();

const {
  cartQuantities,
  addToCart,
  buyNow,
  isInCart,
  getQuantity,
  setQuantity,
} = useCart();
const { isFavorite, toggleFavorite } = useWishlist();
const { catalog } = useProducts();

const {
  selectedOptions,
  hasVariants,
  optionGroups,
  activeVariant,
  lineKey,
  productHasStock,
  canPurchase,
  showNotifyMe,
  inStock,
  maxQuantity,
  displayPrice,
  selectionHint,
  fewLeft,
  setOptions,
  selectOption,
  optionValueAvailable,
  optionSwatchHex,
  ensureVariantReady,
} = useVariantSelection(product);

const purchasePanelRef = useTemplateRef("purchasePanelRef");

const displayName = computed(
  () => product.value?.title?.trim() || "Untitled product",
);

const brandOrCategory = computed(() => {
  const brand =
    typeof product.value?.brand === "string" ? product.value.brand.trim() : "";
  if (brand) return brand;
  return product.value?.categoryLabel || product.value?.category || "";
});

const favorited = computed(() =>
  product.value ? isFavorite(product.value.id) : false,
);

const reviews = computed(() =>
  Array.isArray(product.value?.reviews) ? product.value.reviews : [],
);

const similarProducts = computed(() =>
  getSimilarProducts(product.value, catalog.value),
);

const similarPreview = computed(() =>
  similarProducts.value.slice(0, SIMILAR_PREVIEW_LIMIT),
);

const showSimilarViewAll = computed(
  () => similarProducts.value.length > SIMILAR_PREVIEW_LIMIT,
);

const similarViewAllTo = computed(() =>
  similarProductsListingTo(product.value),
);

const similarWatchKey = computed(
  () =>
    `${product.value?.id ?? ""}:${similarPreview.value.length}:${showSimilarViewAll.value}`,
);

const comparableProducts = computed(() =>
  getComparableProducts(product.value, catalog.value),
);

const canCompare = computed(() => comparableProducts.value.length > 0);

const productCompareRef = useTemplateRef("productCompareRef");

/** Gallery jumps when the active variant names an image frame. */
const variantImageIndex = computed(() => {
  const index = Number(activeVariant.value?.imageIndex);
  return Number.isFinite(index) ? index : null;
});

function onOpenCompare() {
  productCompareRef.value?.openPanel?.();
}

/**
 * Keep path on `/:category/:slug` and variant picks in `?opts=` / `?variant=`.
 */
function syncDetailsLocation() {
  if (!product.value?.slug) return;

  const target = productDetailsTo(product.value, {
    selectedOptions: selectedOptions.value,
  });
  const targetQuery = target.query ?? {};

  const onLegacyFlat =
    route.name === "product-details-legacy" ||
    route.name === "product-details-unscoped";
  const slugMismatch = String(route.params.slug ?? "") !== target.params.slug;
  const routeCategory = resolveStorefrontCategory(route.params.category);
  const targetCategory = target.params.category ?? "";
  const categoryMismatch =
    Boolean(targetCategory) && routeCategory !== targetCategory;
  const hasStaleIdQuery = route.query.id != null || route.query.slug != null;

  const currentOpts = route.query.opts != null ? String(route.query.opts) : "";
  const currentVariant =
    route.query.variant != null ? String(route.query.variant) : "";
  const nextOpts = targetQuery.opts ?? "";
  const nextVariant = targetQuery.variant ?? "";
  const variantQueryMismatch =
    currentOpts !== nextOpts || currentVariant !== nextVariant;

  if (
    !onLegacyFlat &&
    !slugMismatch &&
    !categoryMismatch &&
    !hasStaleIdQuery &&
    !variantQueryMismatch
  ) {
    return;
  }

  router.replace({
    name: target.name,
    params: target.params,
    query: targetQuery,
    state: target.state,
  });
}

watch(
  product,
  (next, prev) => {
    if (!next?.id) return;

    const productChanged = String(next.id) !== String(prev?.id ?? "");
    if (productChanged) {
      trackView(next);
      setOptions(
        selectedOptionsFromNavigation(next, route.query, window.history.state),
      );
    } else if (Object.keys(selectedOptions.value).length === 0) {
      const fromNav = selectedOptionsFromNavigation(
        next,
        route.query,
        window.history.state,
      );
      if (Object.keys(fromNav).length > 0) {
        setOptions(fromNav);
      }
    }

    syncDetailsLocation();
  },
  { immediate: true },
);

watch(
  selectedOptions,
  () => {
    if (!product.value?.id) return;
    syncDetailsLocation();
  },
  { deep: true },
);

/**
 * @param {number | null} qty
 */
function resolveQtyOrToast(qty) {
  if (qty == null) {
    toast.info("Enter a quantity of 1 or more");
    return null;
  }
  return qty;
}

function onAddToCart(qtyFromPanel) {
  if (!product.value || !productHasStock.value) return;
  const ready = ensureVariantReady();
  if (!ready.ok) {
    toast.info(ready.message);
    return;
  }

  const qty = resolveQtyOrToast(
    qtyFromPanel ?? purchasePanelRef.value?.quantityForCart?.() ?? null,
  );
  if (qty == null) return;

  const key = lineKey.value;
  const variant = activeVariant.value;

  if (key && isInCart(key)) {
    const before = getQuantity(key);
    setQuantity(key, before + qty);
    const after = getQuantity(key);
    if (after === before) {
      toast.info(`Only ${after} available in stock`);
      return;
    }
    toast.success(`${displayName.value} added to cart`);
    return;
  }

  if (addToCart(product.value, qty, variant)) {
    toast.success(`${displayName.value} added to cart`);
    return;
  }
  toast.error(`Couldn't add ${displayName.value} to cart`);
}

function onBuyNow(qtyFromPanel) {
  if (!product.value || !productHasStock.value) return;
  const ready = ensureVariantReady();
  if (!ready.ok) {
    toast.info(ready.message);
    return;
  }

  const key = lineKey.value;
  const variant = activeVariant.value;
  const wasNew = !(key && isInCart(key));
  if (wasNew) {
    const qty = resolveQtyOrToast(
      qtyFromPanel ?? purchasePanelRef.value?.quantityForCart?.() ?? null,
    );
    if (qty == null) return;
    if (!addToCart(product.value, qty, variant)) {
      toast.error(`Couldn't add ${displayName.value} to cart`);
      return;
    }
    toast.success(`${displayName.value} added to cart`);
  } else if (!buyNow(product.value, variant)) {
    toast.error(`Couldn't add ${displayName.value} to cart`);
    return;
  }
  router.push({ name: "cart" });
}

function onNotifyMe() {
  if (!product.value) return;
  toast.info(`We'll notify you when ${displayName.value} is back in stock`);
}

function onToggleFavorite() {
  if (!product.value) return;
  const result = toggleFavorite(product.value);
  if (result === "added") {
    toast.favorite(`${displayName.value} added to favorites`);
  } else if (result === "removed") {
    toast.favorite(`${displayName.value} removed from favorites`);
  }
}

function continueShopping() {
  router.push({ name: "products" });
}

function productLabel(item) {
  return item?.title?.trim() || "Item";
}

function onSimilarAddToCart(item, variant = null) {
  if (addToCart(item, 1, variant)) {
    toast.success(`${productLabel(item)} added to cart`);
    return;
  }
  toast.error(`Couldn't add ${productLabel(item)} to cart`);
}

function onSimilarGoToCart() {
  router.push({ name: "cart" });
}

function onSimilarToggleFavorite(item) {
  const result = toggleFavorite(item);
  if (result === "added") {
    toast.favorite(`${productLabel(item)} added to favorites`);
  } else if (result === "removed") {
    toast.favorite(`${productLabel(item)} removed from favorites`);
  }
}

function onSimilarSeeAllOptions(item) {
  if (!item?.id) return;
  router.push(productDetailsTo(item));
}

function onSimilarViewAll() {
  const to = similarViewAllTo.value;
  if (to) router.push(to);
  else continueShopping();
}

const breadcrumbItems = computed(() => {
  /** @type {{ label: string, to?: { name: string, query?: Record<string, string> } }[]} */
  const items = [{ label: "Home", to: { name: "products" } }];

  if (!product.value) {
    items.push({
      label: notFound.value
        ? "Not found"
        : loading.value
          ? "Loading…"
          : "Product",
    });
    return items;
  }

  const category = product.value.category;
  const categoryLabel =
    product.value.categoryLabel || product.value.category || "";
  if (category && categoryLabel) {
    items.push({
      label: categoryLabel,
      to: { name: "products-category", params: { category } },
    });
  }

  items.push({ label: displayName.value });
  return items;
});
</script>

<template>
  <div class="product-details">
    <div class="container product-details__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <div
        v-if="loading && !product"
        class="product-details__state"
        aria-busy="true"
        aria-live="polite"
      >
        <div class="product-details__skeleton" aria-hidden="true">
          <div class="product-details__skeleton-media" />
          <div class="product-details__skeleton-body">
            <div class="product-details__skeleton-line" />
            <div
              class="product-details__skeleton-line product-details__skeleton-line--short"
            />
            <div
              class="product-details__skeleton-line product-details__skeleton-line--mid"
            />
          </div>
        </div>
        <p class="product-details__state-text">Loading product…</p>
      </div>

      <EmptyState
        v-else-if="(error || notFound) && !product"
        variant="error"
        :message="error || 'This product could not be found.'"
      >
        <template #actions>
          <button
            v-if="!notFound"
            type="button"
            class="btn btn--primary"
            @click="retry"
          >
            Try again
          </button>
          <button
            type="button"
            class="btn btn--tertiary"
            @click="continueShopping"
          >
            Browse products
          </button>
        </template>
      </EmptyState>

      <template v-else-if="product">
        <div class="product-details__layout">
          <ProductGallery
            :product="product"
            :display-name="displayName"
            :favorited="favorited"
            :variant-image-index="variantImageIndex"
            @toggle-favorite="onToggleFavorite"
          />

          <ProductPurchasePanel
            ref="purchasePanelRef"
            :product="product"
            :display-name="displayName"
            :brand-or-category="brandOrCategory"
            :selected-options="selectedOptions"
            :has-variants="hasVariants"
            :option-groups="optionGroups"
            :active-variant="activeVariant"
            :product-has-stock="productHasStock"
            :can-purchase="canPurchase"
            :show-notify-me="showNotifyMe"
            :in-stock="inStock"
            :max-quantity="maxQuantity"
            :display-price="displayPrice"
            :selection-hint="selectionHint"
            :few-left="fewLeft"
            :can-compare="canCompare"
            :option-value-available="optionValueAvailable"
            :option-swatch-hex="optionSwatchHex"
            @select-option="selectOption"
            @add-to-cart="onAddToCart"
            @buy-now="onBuyNow"
            @notify-me="onNotifyMe"
            @open-compare="onOpenCompare"
          />
        </div>

        <ProductReviews :reviews="reviews" />

        <ProductCompare
          v-if="canCompare && product"
          ref="productCompareRef"
          :product="product"
          :candidates="comparableProducts"
        />

        <ProductCarousel
          v-if="similarPreview.length"
          title="Similar products"
          heading-id="similar-heading"
          list-label="Similar products"
          :watch-key="similarWatchKey"
          section-class="product-carousel--details"
        >
          <li
            v-for="item in similarPreview"
            :key="item.id"
            class="product-carousel__item"
          >
            <ProductCard
              :product="item"
              :favorited="isFavorite(item.id)"
              :quantity="cartQuantities[item.id] ?? 0"
              @add-to-cart="onSimilarAddToCart"
              @go-to-cart="onSimilarGoToCart"
              @toggle-favorite="onSimilarToggleFavorite"
              @see-all-options="onSimilarSeeAllOptions"
            />
          </li>
          <li
            v-if="showSimilarViewAll"
            class="product-carousel__item product-carousel__item--view-all"
          >
            <button
              type="button"
              class="product-carousel__view-all"
              @click="onSimilarViewAll"
            >
              <span class="product-carousel__view-all-label">View all</span>
              <span class="product-carousel__view-all-count">
                {{ similarProducts.length }} products
              </span>
            </button>
          </li>
        </ProductCarousel>

        <RecentlyViewedProducts
          :exclude-id="product?.id"
          section-class="product-carousel--details"
        />

        <p
          v-if="error && product"
          class="product-details__refresh-note"
          role="status"
        >
          Showing cached product details.
          <button
            type="button"
            class="product-details__retry-link"
            @click="retry"
          >
            Retry
          </button>
        </p>
      </template>
    </div>
  </div>
</template>

<style>
@import "@/assets/styles/components/product-details.css";
</style>
