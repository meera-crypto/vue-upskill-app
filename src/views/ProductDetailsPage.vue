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
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
} from "@/services/productService.js";
import { useProductDetail } from "@/composables/useProductDetail.js";
import { useProducts } from "@/composables/useProducts.js";
import { useCart } from "@/composables/useCart.js";
import { useFavorites } from "@/composables/useFavorites.js";
import { useRecentlyViewed } from "@/composables/useRecentlyViewed.js";
import { useToast } from "@/composables/useToast.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import {
  getSimilarProducts,
  similarProductsListingTo,
} from "@/utils/similarProducts.js";

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

/**
 * Keep `?slug=` in sync with the loaded product (id still wins for fetching).
 * Covers id-only links and old `/products/:id` redirects.
 * Also records the visit for “Recently viewed” (shared localStorage list).
 */
watch(product, (next) => {
  if (!next?.id) return;

  trackView(next);

  const expected = productDetailsTo(next).query;
  const currentId = Array.isArray(route.query.id)
    ? route.query.id[0]
    : route.query.id;
  const currentSlug = Array.isArray(route.query.slug)
    ? route.query.slug[0]
    : route.query.slug;

  if (String(currentId) !== expected.id) return;
  if ((currentSlug || "") === (expected.slug || "")) return;

  router.replace({
    name: "product-details",
    query: expected,
  });
});

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
 * Quantity field value as a string so the input can be briefly empty while typing.
 * Local UI only until Add to cart / Buy now.
 */
const quantityInput = ref("1");

const displayName = computed(
  () => product.value?.title?.trim() || "Untitled product",
);

const brandOrCategory = computed(() => {
  const brand =
    typeof product.value?.brand === "string" ? product.value.brand.trim() : "";
  if (brand) return brand;
  return product.value?.categoryLabel || product.value?.category || "";
});

const inStock = computed(() => (product.value?.stock ?? 0) > 0);
const maxQuantity = computed(() => {
  const stock = Number(product.value?.stock);
  return Number.isFinite(stock) && stock > 0 ? stock : 1;
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

const fewLeft = computed(
  () => inStock.value && (product.value?.stock ?? 0) < 30,
);

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
  if (product.value.sku) rows.push({ label: "SKU", value: product.value.sku });
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

watch(
  () => product.value?.id,
  () => {
    selectedImageIndex.value = 0;
    quantityInput.value = "1";
  },
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

function quantityForCart() {
  const qty = resolvedQuantity.value;
  if (qty == null) {
    toast.info("Enter a quantity of 1 or more");
    return null;
  }
  return qty;
}

function onAddToCart() {
  if (!product.value || !inStock.value) return;

  const qty = quantityForCart();
  if (qty == null) return;

  const id = product.value.id;

  // Each click adds the selected qty (capped by stock), including repeats.
  if (isInCart(id)) {
    const before = getQuantity(id);
    setQuantity(id, before + qty);
    const after = getQuantity(id);
    if (after === before) {
      toast.info(`Only ${after} available in stock`);
      return;
    }
    toast.success(`${displayName.value} added to cart`);
    return;
  }

  if (addToCart(product.value, qty)) {
    toast.success(`${displayName.value} added to cart`);
  }
}

function onBuyNow() {
  if (!product.value || !inStock.value) return;

  const wasNew = !cartQuantities.value[product.value.id];
  if (wasNew) {
    const qty = quantityForCart();
    if (qty == null) return;
    if (!addToCart(product.value, qty)) return;
    toast.success(`${displayName.value} added to cart`);
  } else if (!buyNow(product.value)) {
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

function onSimilarAddToCart(item) {
  if (addToCart(item)) {
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
            <div class="product-details__stage">
              <img
                class="product-details__image"
                :src="activeImage"
                :alt="displayName"
                width="500"
                height="500"
                @error="onImageError"
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
                ${{ Number(product.price).toFixed(2) }}
              </p>
              <p
                v-if="showDiscount"
                class="product-details__price product-details__price--original"
              >
                ${{ Number(product.originalPrice).toFixed(2) }}
              </p>
              <p v-if="discountPercentLabel" class="product-details__offer">
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
              <template v-if="!inStock">Out of stock</template>
              <template v-else-if="fewLeft">Only a few left</template>
              <template v-else>In stock</template>
            </p>

            <p v-if="product.description" class="product-details__description">
              {{ product.description }}
            </p>

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

            <div v-if="inStock" class="product-details__buy-box">
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
                      :disabled="!canDecreaseQty"
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
                      :aria-label="`Quantity (max ${maxQuantity})`"
                      @blur="onQtyBlur"
                    />
                    <button
                      type="button"
                      class="product-details__qty-btn"
                      :disabled="!canIncreaseQty"
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
                  @click="onAddToCart"
                >
                  Add to cart
                </button>
              </div>

              <button
                type="button"
                class="btn btn--tertiary product-details__buy"
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
