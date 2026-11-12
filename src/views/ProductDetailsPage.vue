<script setup>
/**
 * Product details — one product at `/product?id=101&slug=…`.
 *
 * Vue concepts:
 * - `route.query.id` drives the fetch (required, shareable like listing `?q=`)
 * - `route.query.slug` is readable URL text; synced once the product loads
 * - `useProductDetail` watches that id, fetches, and cancels stale requests
 * - Shared `useCart` / `useFavorites` keep header badges in sync
 * - Qty uses a − / typed input / + stepper (clamped to stock)
 * - Variant options: `selectedOptions` ref + `computed` activeVariant
 * - Quick-view picks arrive via `?opts=` / `?variant=` and hydrate selection
 * - Similar products: `computed` from the shared catalog + current product
 * - Similar + Recently viewed rows share ProductCarousel (one scroll UI)
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Heart, Minus, Plus, Star } from "@lucide/vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import ProductCard from "@/components/ProductCard.vue";
import ProductCarousel from "@/components/ProductCarousel.vue";
import RecentlyViewedProducts from "@/components/RecentlyViewedProducts.vue";
import {
  COLOR_SWATCH_HEX,
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
} from "@/services/productService.js";
import { useProductDetail } from "@/composables/useProductDetail.js";
import { useProducts } from "@/composables/useProducts.js";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { useRecentlyViewed } from "@/composables/useRecentlyViewed.js";
import { useToast } from "@/composables/useToast.js";
import {
  productDetailsTo,
  selectedOptionsFromQuery,
} from "@/utils/productRoutes.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import {
  getSimilarProducts,
  similarProductsListingTo,
} from "@/utils/similarProducts.js";
import {
  cartLineKey,
  findVariantByOptions,
  formatSelectedOptions,
  isOptionValueAvailable,
  isVariantSelectionComplete,
  productHasVariants,
  productOptions,
} from "@/utils/variants.js";

/** Max cards in the horizontal similar row before “View all”. */
const SIMILAR_PREVIEW_LIMIT = 8;

const route = useRoute();
const router = useRouter();
const toast = useToast();

/** Read from `?id=` so refresh / share / back keep the same product. */
const productId = computed(() => route.query.id);
const { product, loading, error, notFound, retry } =
  useProductDetail(productId);

const { trackView } = useRecentlyViewed();

const {
  cartQuantities,
  addToCart,
  buyNow,
  isInCart,
  getQuantity,
  setQuantity,
} = useCart();
const { isFavorite, toggleFavorite } = useFavorites();
/** Shared catalog — same fetch the listing uses (loads on mount if needed). */
const { catalog } = useProducts();

const selectedImageIndex = ref(0);

/**
 *  image zoom (desktop hover):
 * - translucent square lens on the main image
 * - large zoomed preview panel to the right of the gallery
 */
const isZooming = ref(false);
const lensStyle = ref(/** @type {Record<string, string>} */ ({}));
const zoomResultStyle = ref(/** @type {Record<string, string>} */ ({}));
/** How much larger the side panel shows vs the lens region. */
const ZOOM_LEVEL = 2;

/**
 * Quantity field value as a string so the input can be briefly empty while typing.
 * Local UI only until Add to cart / Buy now.
 */
const quantityInput = ref("1");

/**
 * Selected option map for variant products, e.g. `{ Color: "Blue", Size: "M" }`.
 * Plain object in a ref — replace the whole object when an option changes so
 * Vue tracks the update (same idea as updating a reactive filter bag).
 * May be hydrated from `?opts=` / `?variant=` (card quick view → details).
 */
const selectedOptions = ref(/** @type {Record<string, string>} */ ({}));

const displayName = computed(
  () => product.value?.title?.trim() || "Untitled product",
);

const brandOrCategory = computed(() => {
  const brand =
    typeof product.value?.brand === "string" ? product.value.brand.trim() : "";
  if (brand) return brand;
  return product.value?.categoryLabel || product.value?.category || "";
});

const hasVariants = computed(() => productHasVariants(product.value));
const optionGroups = computed(() => productOptions(product.value));

const selectionComplete = computed(() =>
  isVariantSelectionComplete(product.value, selectedOptions.value),
);

/** Matched SKU for the current option combination (or null). */
const activeVariant = computed(() =>
  findVariantByOptions(product.value, selectedOptions.value),
);

const lineKey = computed(() =>
  product.value ? cartLineKey(product.value, activeVariant.value) : "",
);

/** Parent catalog stock (any variant left) — controls whether the buy box shows. */
const productHasStock = computed(() => (product.value?.stock ?? 0) > 0);

/**
 * Purchasable right now: in stock, and if variants exist the selection must
 * resolve to an in-stock SKU.
 */
const canPurchase = computed(() => {
  if (!productHasStock.value) return false;
  if (!hasVariants.value) return true;
  if (!selectionComplete.value) return false;
  return (activeVariant.value?.stock ?? 0) > 0;
});

const inStock = computed(() => {
  if (!hasVariants.value) return productHasStock.value;
  if (!selectionComplete.value) return productHasStock.value;
  return (activeVariant.value?.stock ?? 0) > 0;
});

const maxQuantity = computed(() => {
  const stock = hasVariants.value
    ? Number(activeVariant.value?.stock)
    : Number(product.value?.stock);
  return Number.isFinite(stock) && stock > 0 ? stock : 1;
});

const displayPrice = computed(() => {
  if (
    activeVariant.value &&
    Number.isFinite(Number(activeVariant.value.price))
  ) {
    return Number(activeVariant.value.price);
  }
  return Number(product.value?.price) || 0;
});

const missingOptionNames = computed(() => {
  if (!hasVariants.value) return [];
  return optionGroups.value
    .filter((option) => !selectedOptions.value[option.name])
    .map((option) => option.name);
});

const selectionHint = computed(() => {
  if (!hasVariants.value) return "";
  if (missingOptionNames.value.length > 0) {
    return `Select ${missingOptionNames.value.join(" and ")}`;
  }
  if (selectionComplete.value && !activeVariant.value) {
    return "This combination is unavailable";
  }
  if (selectionComplete.value && (activeVariant.value?.stock ?? 0) <= 0) {
    return "This combination is out of stock";
  }
  return "";
});

/**
 * Final qty for Add to cart / Buy now.
 * `null` means the field is empty or invalid.
 */
const resolvedQuantity = computed(() => {
  const raw = String(quantityInput.value).trim();
  if (!raw) return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(maxQuantity.value, n);
});

const canDecreaseQty = computed(() => (resolvedQuantity.value ?? 1) > 1);
const canIncreaseQty = computed(
  () => (resolvedQuantity.value ?? 0) < maxQuantity.value,
);

const showDiscount = computed(() =>
  product.value ? hasValidDiscount(product.value) : false,
);

const discountPercentLabel = computed(() => {
  if (!showDiscount.value || !product.value) return "";
  return `${Math.round(Number(product.value.discountPercentage))}% off`;
});

const fewLeft = computed(() => {
  if (!canPurchase.value) return false;
  const stock = hasVariants.value
    ? Number(activeVariant.value?.stock)
    : Number(product.value?.stock);
  return Number.isFinite(stock) && stock > 0 && stock < 30;
});

const displaySku = computed(() => {
  if (activeVariant.value?.sku) return String(activeVariant.value.sku);
  return product.value?.sku ? String(product.value.sku) : "";
});

const hasRating = computed(() => typeof product.value?.rating === "number");

/** CSS modifier for the badge background (red → green by score). */
const ratingBadgeTone = computed(() =>
  getRatingBadgeTone(product.value?.rating),
);

const ratingLabel = computed(() => {
  if (!hasRating.value || !product.value) return "";
  const score = product.value.rating.toFixed(1);
  const reviews = product.value.reviewCount;
  if (typeof reviews === "number" && reviews > 0) {
    return `${score} out of 5 stars, ${reviews} review${reviews === 1 ? "" : "s"}`;
  }
  return `${score} out of 5 stars`;
});

const images = computed(() => {
  const list = Array.isArray(product.value?.images)
    ? product.value.images.filter(
        (url) => typeof url === "string" && url.length > 0,
      )
    : [];
  return list.length > 0 ? list : [PRODUCT_IMAGE_FALLBACK];
});

const activeImage = computed(
  () => images.value[selectedImageIndex.value] ?? images.value[0],
);

const favorited = computed(() =>
  product.value ? isFavorite(product.value.id) : false,
);

const reviews = computed(() =>
  Array.isArray(product.value?.reviews) ? product.value.reviews : [],
);

/**
 * Other catalog products in the same category, ranked by brand + shared tags.
 * `computed` recalculates when the detail product or catalog changes.
 */
const similarProducts = computed(() =>
  getSimilarProducts(product.value, catalog.value),
);

/** First 8 for the horizontal scroller. */
const similarPreview = computed(() =>
  similarProducts.value.slice(0, SIMILAR_PREVIEW_LIMIT),
);

const showSimilarViewAll = computed(
  () => similarProducts.value.length > SIMILAR_PREVIEW_LIMIT,
);

/** Listing route with category (or brand) filters pre-applied. */
const similarViewAllTo = computed(() =>
  similarProductsListingTo(product.value),
);

/** Remeasure ProductCarousel arrows when similar row content changes. */
const similarWatchKey = computed(
  () =>
    `${product.value?.id ?? ""}:${similarPreview.value.length}:${showSimilarViewAll.value}`,
);

const infoRows = computed(() => {
  if (!product.value) return [];
  /** @type {{ label: string, value: string }[]} */
  const rows = [];
  if (displaySku.value) rows.push({ label: "SKU", value: displaySku.value });
  const selectedLabel = formatSelectedOptions(selectedOptions.value);
  if (selectedLabel) {
    rows.push({ label: "Selected", value: selectedLabel });
  }
  if (product.value.availabilityStatus) {
    rows.push({
      label: "Availability",
      value: product.value.availabilityStatus,
    });
  }
  if (product.value.shippingInformation) {
    rows.push({
      label: "Shipping",
      value: product.value.shippingInformation,
    });
  }
  if (product.value.warrantyInformation) {
    rows.push({
      label: "Warranty",
      value: product.value.warrantyInformation,
    });
  }
  if (product.value.returnPolicy) {
    rows.push({ label: "Returns", value: product.value.returnPolicy });
  }
  return rows;
});

/** When a variant maps to a gallery frame, jump the main image. */
watch(activeVariant, (variant) => {
  if (!variant) return;
  const index = Number(variant.imageIndex);
  if (Number.isFinite(index) && index >= 0 && index < images.value.length) {
    selectedImageIndex.value = index;
  }
});

/**
 * Write id / slug / opts / variant into the URL without adding history entries.
 * Keeps refresh + share in sync with the current selection.
 */
function syncDetailsQuery() {
  if (!product.value?.id) return;

  const expected = productDetailsTo(product.value, {
    selectedOptions: selectedOptions.value,
  }).query;

  const keys = new Set([...Object.keys(expected), ...Object.keys(route.query)]);
  let changed = false;
  for (const key of keys) {
    const nextVal = expected[key] ?? "";
    const rawCurrent = route.query[key];
    const currentVal = Array.isArray(rawCurrent)
      ? (rawCurrent[0] ?? "")
      : (rawCurrent ?? "");
    if (String(currentVal) !== String(nextVal)) {
      changed = true;
      break;
    }
  }
  if (!changed) return;

  router.replace({
    name: "product-details",
    query: expected,
  });
}

/**
 * Keep slug + variant query in sync with the loaded product (id still wins
 * for fetching). Hydrate quick-view picks from the URL when the product changes.
 * Also records the visit for “Recently viewed”.
 *
 * `immediate: true` matters: useProductDetail may set a cached product during
 * setup *before* this watch is registered. Without immediate, that first value
 * is skipped; the later network replace has the same id so we never hydrate,
 * then syncDetailsQuery() would strip `opts` from the URL.
 */
watch(
  product,
  (next, prev) => {
    if (!next?.id) return;

    const productChanged = String(next.id) !== String(prev?.id ?? "");
    if (productChanged) {
      trackView(next);
      selectedImageIndex.value = 0;
      quantityInput.value = "1";
      selectedOptions.value = selectedOptionsFromQuery(next, route.query);
    } else if (Object.keys(selectedOptions.value).length === 0) {
      // Cache → network refresh (same id): still apply URL picks if empty.
      const fromQuery = selectedOptionsFromQuery(next, route.query);
      if (Object.keys(fromQuery).length > 0) {
        selectedOptions.value = fromQuery;
      }
    }

    syncDetailsQuery();
  },
  { immediate: true },
);

/** If stock drops below the typed qty, clamp to the new max. */
watch(maxQuantity, (max) => {
  const n = Math.floor(Number(quantityInput.value));
  if (Number.isFinite(n) && n > max) {
    quantityInput.value = String(max);
  }
});

/**
 * Write a clamped whole number into the qty field.
 * @param {number} n
 */
function setQtyInput(n) {
  const clamped = Math.min(maxQuantity.value, Math.max(1, Math.floor(n)));
  quantityInput.value = String(clamped);
}

function decreaseQty() {
  setQtyInput((resolvedQuantity.value ?? 1) - 1);
}

function increaseQty() {
  setQtyInput((resolvedQuantity.value ?? 0) + 1);
}

/** Normalize empty / over-max / fractional values when the field loses focus. */
function onQtyBlur() {
  const qty = resolvedQuantity.value;
  quantityInput.value = String(qty == null ? 1 : qty);
}

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function selectImage(index) {
  selectedImageIndex.value = index;
}

/**
 * side zoom needs desktop layout + real hover.
 * Below md the gallery is full-width, so a right-hand panel would clip.
 */
function canUseImageZoom() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 768px)",
    ).matches
  );
}

function onZoomEnter() {
  if (!canUseImageZoom()) return;
  isZooming.value = true;
}

function onZoomLeave() {
  isZooming.value = false;
}

/**
 * zoom: lens = stage / ZOOM_LEVEL so the side panel
 * (same size as the stage) shows exactly that region magnified.
 * @param {MouseEvent} event
 */
function onZoomMove(event) {
  if (!canUseImageZoom()) return;

  const stage = /** @type {HTMLElement} */ (event.currentTarget);
  const rect = stage.getBoundingClientRect();
  const lensW = rect.width / ZOOM_LEVEL;
  const lensH = rect.height / ZOOM_LEVEL;

  const lensX = Math.max(
    0,
    Math.min(event.clientX - rect.left - lensW / 2, rect.width - lensW),
  );
  const lensY = Math.max(
    0,
    Math.min(event.clientY - rect.top - lensH / 2, rect.height - lensH),
  );

  lensStyle.value = {
    width: `${lensW}px`,
    height: `${lensH}px`,
    left: `${lensX}px`,
    top: `${lensY}px`,
  };

  zoomResultStyle.value = {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundImage: `url(${activeImage.value})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${rect.width * ZOOM_LEVEL}px ${rect.height * ZOOM_LEVEL}px`,
    backgroundPosition: `-${lensX * ZOOM_LEVEL}px -${lensY * ZOOM_LEVEL}px`,
  };
  isZooming.value = true;
}

/**
 * @param {string} optionName
 * @param {string} optionValue
 */
function selectOption(optionName, optionValue) {
  selectedOptions.value = {
    ...selectedOptions.value,
    [optionName]: optionValue,
  };
  syncDetailsQuery();
}

/**
 * @param {string} optionName
 * @param {string} optionValue
 */
function optionValueAvailable(optionName, optionValue) {
  return isOptionValueAvailable(
    product.value,
    optionName,
    optionValue,
    selectedOptions.value,
  );
}

/**
 * Color options get swatches when we know a hex; everything else is a chip.
 * @param {string} optionName
 * @param {string} optionValue
 */
function optionSwatchHex(optionName, optionValue) {
  if (optionName.toLowerCase() !== "color") return "";
  const key = String(optionValue).trim().toLowerCase();
  return COLOR_SWATCH_HEX[key] || "";
}

function quantityForCart() {
  const qty = resolvedQuantity.value;
  if (qty == null) {
    toast.info("Enter a quantity of 1 or more");
    return null;
  }
  return qty;
}

function ensureVariantReady() {
  if (!product.value) return false;
  if (!hasVariants.value) return true;
  if (!selectionComplete.value) {
    toast.info(selectionHint.value || "Select product options");
    return false;
  }
  if (!activeVariant.value || (activeVariant.value.stock ?? 0) <= 0) {
    toast.info(selectionHint.value || "This combination is unavailable");
    return false;
  }
  return true;
}

function onAddToCart() {
  if (!product.value || !productHasStock.value) return;
  if (!ensureVariantReady()) return;

  const qty = quantityForCart();
  if (qty == null) return;

  const key = lineKey.value;
  const variant = activeVariant.value;

  // Each click adds the selected qty (capped by stock), including repeats.
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
  }
}

function onBuyNow() {
  if (!product.value || !productHasStock.value) return;
  if (!ensureVariantReady()) return;

  const key = lineKey.value;
  const variant = activeVariant.value;
  const wasNew = !(key && isInCart(key));
  if (wasNew) {
    const qty = quantityForCart();
    if (qty == null) return;
    if (!addToCart(product.value, qty, variant)) return;
    toast.success(`${displayName.value} added to cart`);
  } else if (!buyNow(product.value, variant)) {
    return;
  }
  router.push({ name: "cart" });
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
  }
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

/**
 * Products → Category → Product name.
 * While loading / not found, keep a short trail so navigation still works.
 */
const breadcrumbItems = computed(() => {
  /** @type {{ label: string, to?: { name: string, query?: Record<string, string> } }[]} */
  const items = [{ label: "Products", to: { name: "products" } }];

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
      to: { name: "products", query: { category } },
    });
  }

  items.push({ label: displayName.value });
  return items;
});
</script>

<template>
  <main class="product-details">
    <div class="container product-details__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <!-- Loading -->
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

      <!-- Error / not found -->
      <div
        v-else-if="(error || notFound) && !product"
        class="product-details__state"
        role="alert"
      >
        <p class="product-details__state-text">
          {{ error || "This product could not be found." }}
        </p>
        <div class="product-details__state-actions">
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
        </div>
      </div>

      <!-- Product -->
      <template v-else-if="product">
        <div class="product-details__layout">
          <section class="product-details__gallery" aria-label="Product images">
            <!-- Vertical strip to the left of the main image -->
            <ul
              v-if="images.length > 1"
              class="product-details__thumbs"
              aria-label="More images"
            >
              <li v-for="(url, index) in images" :key="`${url}-${index}`">
                <button
                  type="button"
                  class="product-details__thumb"
                  :class="{
                    'product-details__thumb--active':
                      index === selectedImageIndex,
                  }"
                  :aria-label="`View image ${index + 1}`"
                  :aria-current="
                    index === selectedImageIndex ? 'true' : undefined
                  "
                  @click="selectImage(index)"
                >
                  <img
                    :src="url"
                    :alt="`${displayName} thumbnail ${index + 1}`"
                    width="72"
                    height="72"
                    loading="lazy"
                    @error="onImageError"
                  />
                </button>
              </li>
            </ul>

            <div
              class="product-details__stage"
              @mouseenter="onZoomEnter"
              @mousemove="onZoomMove"
              @mouseleave="onZoomLeave"
            >
              <img
                class="product-details__image"
                :src="activeImage"
                :alt="displayName"
                width="500"
                height="500"
                @error="onImageError"
              />
              <div
                v-show="isZooming"
                class="product-details__lens"
                :style="lensStyle"
                aria-hidden="true"
              />
              <button
                type="button"
                class="product-details__favorite"
                :class="{
                  'product-details__favorite--active': favorited,
                }"
                :aria-label="
                  favorited ? 'Remove from favorites' : 'Add to favorites'
                "
                :aria-pressed="favorited"
                @click="onToggleFavorite"
              >
                <Heart
                  :size="20"
                  :fill="favorited ? 'currentColor' : 'none'"
                  aria-hidden="true"
                />
              </button>
            </div>

            <!-- Zooms the lens region; overlays the info column  -->
            <div
              v-show="isZooming"
              class="product-details__zoom-result"
              :style="zoomResultStyle"
              aria-hidden="true"
            />
          </section>

          <section
            class="product-details__info"
            aria-labelledby="product-title"
          >
            <p v-if="brandOrCategory" class="product-details__brand">
              {{ brandOrCategory }}
            </p>

            <h1 id="product-title" class="product-details__title">
              {{ displayName }}
            </h1>

            <p
              v-if="hasRating"
              class="product-details__rating"
              :class="
                ratingBadgeTone
                  ? `product-details__rating--${ratingBadgeTone}`
                  : undefined
              "
              :aria-label="ratingLabel"
            >
              <Star
                class="product-details__rating-icon"
                :size="16"
                fill="currentColor"
                aria-hidden="true"
              />
              <span>{{ product.rating.toFixed(1) }}</span>
              <span
                v-if="product.reviewCount"
                class="product-details__rating-count"
              >
                ({{ product.reviewCount }}
                {{ product.reviewCount === 1 ? "review" : "reviews" }})
              </span>
            </p>

            <div class="product-details__pricing">
              <p class="product-details__price">
                ${{ displayPrice.toFixed(2) }}
              </p>
              <p
                v-if="showDiscount && !activeVariant"
                class="product-details__price product-details__price--original"
              >
                ${{ Number(product.originalPrice).toFixed(2) }}
              </p>
              <p
                v-if="discountPercentLabel && !activeVariant"
                class="product-details__offer"
              >
                {{ discountPercentLabel }}
              </p>
            </div>

            <p
              class="product-details__stock"
              :class="{
                'product-details__stock--out': !inStock,
                'product-details__stock--low': fewLeft,
              }"
              aria-live="polite"
            >
              <template v-if="!productHasStock">Out of stock</template>
              <template v-else-if="selectionHint && hasVariants">
                {{ selectionHint }}
              </template>
              <template v-else-if="fewLeft">Only a few left</template>
              <template v-else>In stock</template>
            </p>

            <p v-if="product.description" class="product-details__description">
              {{ product.description }}
            </p>

            <!--
              Variant pickers — only for products with a local overlay.
              selectedOptions is a ref object; each click replaces it so Vue
              re-runs activeVariant / canPurchase computeds.
            -->
            <div
              v-if="hasVariants"
              class="product-details__variants"
              aria-label="Product options"
            >
              <div
                v-for="group in optionGroups"
                :key="group.name"
                class="product-details__option-group"
              >
                <p
                  class="product-details__option-label"
                  :id="`option-${group.name}`"
                >
                  {{ group.name }}
                  <span
                    v-if="selectedOptions[group.name]"
                    class="product-details__option-value"
                  >
                    {{ selectedOptions[group.name] }}
                  </span>
                </p>
                <div
                  class="product-details__option-values"
                  role="group"
                  :aria-labelledby="`option-${group.name}`"
                >
                  <button
                    v-for="value in group.values"
                    :key="`${group.name}-${value}`"
                    type="button"
                    class="product-details__option"
                    :class="{
                      'product-details__option--selected':
                        selectedOptions[group.name] === value,
                      'product-details__option--swatch': !!optionSwatchHex(
                        group.name,
                        value,
                      ),
                      'product-details__option--unavailable':
                        !optionValueAvailable(group.name, value),
                    }"
                    :style="
                      optionSwatchHex(group.name, value)
                        ? {
                            '--swatch': optionSwatchHex(group.name, value),
                          }
                        : undefined
                    "
                    :aria-pressed="selectedOptions[group.name] === value"
                    :aria-label="`${group.name} ${value}`"
                    :title="
                      optionValueAvailable(group.name, value)
                        ? value
                        : `${value} unavailable`
                    "
                    @click="selectOption(group.name, value)"
                  >
                    <span
                      v-if="optionSwatchHex(group.name, value)"
                      class="product-details__swatch"
                      aria-hidden="true"
                    />
                    <span v-else>{{ value }}</span>
                  </button>
                </div>
              </div>
            </div>

            <ul
              v-if="product.tags?.length"
              class="product-details__tags"
              aria-label="Tags"
            >
              <li
                v-for="tag in product.tags"
                :key="tag"
                class="product-details__tag"
              >
                {{ tag }}
              </li>
            </ul>

            <div v-if="productHasStock" class="product-details__buy-box">
              <div class="product-details__purchase-row">
                <div class="product-details__qty">
                  <span
                    id="product-qty-label"
                    class="product-details__qty-label"
                  >
                    Quantity
                  </span>
                  <div
                    class="product-details__qty-stepper"
                    role="group"
                    aria-labelledby="product-qty-label"
                  >
                    <button
                      type="button"
                      class="product-details__qty-btn"
                      :disabled="!canPurchase || !canDecreaseQty"
                      aria-label="Decrease quantity"
                      @click="decreaseQty"
                    >
                      <Minus :size="16" aria-hidden="true" />
                    </button>
                    <input
                      id="product-qty"
                      v-model="quantityInput"
                      class="product-details__qty-input"
                      type="number"
                      inputmode="numeric"
                      min="1"
                      :max="maxQuantity"
                      step="1"
                      :disabled="!canPurchase"
                      :aria-label="`Quantity (max ${maxQuantity})`"
                      @blur="onQtyBlur"
                    />
                    <button
                      type="button"
                      class="product-details__qty-btn"
                      :disabled="!canPurchase || !canIncreaseQty"
                      aria-label="Increase quantity"
                      @click="increaseQty"
                    >
                      <Plus :size="16" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn btn--primary product-details__cart"
                  :disabled="!canPurchase"
                  @click="onAddToCart"
                >
                  Add to cart
                </button>
              </div>

              <button
                type="button"
                class="btn btn--tertiary product-details__buy"
                :disabled="!canPurchase"
                @click="onBuyNow"
              >
                Buy now
              </button>
            </div>

            <p v-else class="product-details__oos-note">
              This item is currently unavailable. Browse similar products from
              the listing.
            </p>

            <dl v-if="infoRows.length" class="product-details__meta-list">
              <div
                v-for="row in infoRows"
                :key="row.label"
                class="product-details__meta-row"
              >
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section
          v-if="reviews.length"
          class="product-details__reviews"
          aria-labelledby="reviews-heading"
        >
          <h2 id="reviews-heading" class="product-details__reviews-title">
            Customer reviews
          </h2>
          <ul class="product-details__reviews-list">
            <li
              v-for="(review, index) in reviews"
              :key="`${review.reviewerName}-${index}`"
              class="product-details__review"
            >
              <div class="product-details__review-header">
                <strong>{{ review.reviewerName || "Customer" }}</strong>
                <span
                  v-if="typeof review.rating === 'number'"
                  class="product-details__review-rating"
                >
                  {{ review.rating.toFixed(1) }} ★
                </span>
              </div>
              <p v-if="review.comment" class="product-details__review-comment">
                {{ review.comment }}
              </p>
            </li>
          </ul>
        </section>

        <!--
          Similar products — same category (ranked by brand + tags).
          Shared ProductCarousel with Recently viewed; View all opens listing.
        -->
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

        <!-- Other products this shopper opened (excludes the current one). -->
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
  </main>
</template>
