<script setup>
/**
 * ProductCard — shows ONE product and talks to parents with emit.
 *
 * Base (< md): horizontal row + full-width cart CTA.
 * md+: vertical card with the same cart CTA.
 *
 * Images use <picture>: a <source> picks a smaller URL below md
 * (thumbnail on mobile; primary image as the <img> fallback for md+).
 * When `product.images` has 2+, desktop hover shows the next gallery image
 * (CSS opacity swap; touch / no-hover devices keep the primary).
 *
 * Qty +/- and Buy now live on the product detail page. Here:
 * - No variants: Add to cart once, then “Go to cart”.
 * - Has variants: “Select option” opens the details page (options live there).
 * - Out of stock (no variants): tertiary “See All Options” → details.
 *
 * Favorites page: pass `favoriteAsClose` so the control is a × remove
 * button (everything there is already saved). Elsewhere: heart toggle only.
 *
 * Quick View (Eye) opens ProductQuickViewDialog for a preview (+ variants).
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { Eye, Heart, Star, X } from "@lucide/vue";
import {
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
} from "@/utils/productModel.js";
import { mediaQueries } from "@/constants/breakpoints.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import { productHasVariants } from "@/utils/variants.js";
import ProductPrice from "@/components/product/ProductPrice.vue";
import ProductRating from "@/components/product/ProductRating.vue";
import ProductQuickViewDialog from "@/components/product/ProductQuickViewDialog.vue";

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  /**
   * Favorites page only: render × instead of the heart so remove reads
   * as “close / dismiss” rather than another heart toggle.
   */
  favoriteAsClose: {
    type: Boolean,
    default: false,
  },
  /** Cart quantity from parent — product-level total (any variant). */
  quantity: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  "add-to-cart",
  "go-to-cart",
  "toggle-favorite",
  "see-all-options",
]);

/** Eye button → ProductQuickViewDialog. */
const quickViewOpen = ref(false);

/** True when this product has size/color (etc.) choices — pick on details. */
const hasVariants = computed(() => productHasVariants(props.product));

/** Simple products already in the bag show “Go to cart”. */
const inCart = computed(() => props.quantity > 0);

const displayName = computed(
  () => props.product.title || props.product.name || "Untitled product",
);

/** Brand when present; otherwise category label (e.g. “Mens Shirts”). */
const brandOrCategory = computed(() => {
  const brand =
    typeof props.product.brand === "string" ? props.product.brand.trim() : "";
  if (brand) return brand;

  const label =
    typeof props.product.categoryLabel === "string"
      ? props.product.categoryLabel.trim()
      : "";
  if (label) return label;

  const category =
    typeof props.product.category === "string"
      ? props.product.category.trim()
      : "";
  return category;
});

const description = computed(() => {
  const text = props.product.description;
  return typeof text === "string" ? text.trim() : "";
});

const inStock = computed(() => (props.product.stock ?? 0) > 0);

/** Strike-through + % off only for a valid discount (never misleading). */
const showDiscount = computed(() => hasValidDiscount(props.product));

/** Low stock hint only — never show the exact count. */
const fewLeft = computed(
  () => inStock.value && (props.product.stock ?? 0) < 30,
);

/** Rounded % off — only when showDiscount is true. */
const discountPercentLabel = computed(() => {
  if (!showDiscount.value) return "";
  return `${Math.round(Number(props.product.discountPercentage))}% off`;
});

/** Only show rating when the API gave us a real number — never invent stars. */
const hasRating = computed(() => typeof props.product.rating === "number");

/** CSS modifier for the badge background (red → green by score). */
const ratingBadgeTone = computed(() =>
  getRatingBadgeTone(props.product.rating),
);

const ratingLabel = computed(() => {
  if (!hasRating.value) return "";
  const score = props.product.rating.toFixed(1);
  const reviews = props.product.reviewCount;
  if (typeof reviews === "number" && reviews > 0) {
    return `${score} out of 5 stars, ${reviews} review${reviews === 1 ? "" : "s"}`;
  }
  return `${score} out of 5 stars`;
});

const displayImage = computed(() => props.product.image);

/** Deduped gallery URLs from the product (primary first when present). */
const galleryImages = computed(() => {
  const raw = Array.isArray(props.product.images) ? props.product.images : [];
  /** @type {string[]} */
  const list = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const url = entry.trim();
    if (url && !list.includes(url)) list.push(url);
  }
  const primary =
    typeof props.product.image === "string" ? props.product.image.trim() : "";
  if (primary && !list.includes(primary)) list.unshift(primary);
  return list;
});

/** Next gallery image for card hover (skipped when there is only one photo). */
const hoverGalleryImage = computed(() => {
  const images = galleryImages.value;
  if (images.length < 2) return "";
  const primary = String(displayImage.value ?? "").trim();
  const next = images.find((url) => url !== primary) ?? images[1];
  return next && next !== primary ? next : "";
});

const hasHoverImage = computed(() => Boolean(hoverGalleryImage.value));

/** Image URL for narrow screens — thumbnail when the API gave a distinct one. */
const mobileImageSrc = computed(() => {
  const thumb =
    typeof props.product.thumbnail === "string"
      ? props.product.thumbnail.trim()
      : "";
  return thumb || props.product.image;
});

const displayPrice = computed(() => Number(props.product.price) || 0);

/** Details route — options are chosen on the PDP, not on the card. */
const detailsTo = computed(() => productDetailsTo(props.product));

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function onAddToCart() {
  if (!inStock.value || hasVariants.value) return;
  emit("add-to-cart", props.product);
}

function onGoToCart(product) {
  emit("go-to-cart", product);
}

function onCartCta(product) {
  if (inCart.value) {
    onGoToCart(product);
  } else {
    onAddToCart();
  }
}

function onToggleFavorite(product) {
  emit("toggle-favorite", product);
}

/** Variant CTA + out-of-stock CTA → product details. */
function onSeeAllOptions(product) {
  emit("see-all-options", product);
}

function openQuickView() {
  quickViewOpen.value = true;
}

function onQuickViewAddToCart(product, variant = null) {
  emit("add-to-cart", product, variant);
}
</script>

<template>
  <article
    class="product-card"
    :class="{ 'product-card--hover-image': hasHoverImage }"
  >
    <div class="product-card__main">
      <div class="product-card__media">
        <RouterLink
          :to="detailsTo"
          class="product-card__media-link"
          :aria-label="`View ${displayName}`"
        >
          <picture class="product-card__picture">
            <!-- untilMd: smaller file below the md layout step. -->
            <source :media="mediaQueries.untilMd" :srcset="mobileImageSrc" />
            <img
              class="product-card__image product-card__image--primary"
              :src="displayImage"
              :alt="displayName"
              width="150"
              height="150"
              loading="lazy"
              @error="onImageError"
            />
          </picture>
          <!-- Preloaded next gallery shot; revealed on hover (CSS). -->
          <img
            v-if="hasHoverImage"
            class="product-card__image product-card__image--hover"
            :src="hoverGalleryImage"
            alt=""
            width="150"
            height="150"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
            @error="onImageError"
          />
        </RouterLink>
        <!-- Favorite + Quick View stacked over the image (outside the media link). -->
        <div class="product-card__media-actions">
          <button
            type="button"
            class="product-card__favorite"
            :class="{
              'product-card__favorite--active': favorited && !favoriteAsClose,
              'product-card__favorite--close': favoriteAsClose,
            }"
            :aria-label="
              favoriteAsClose || favorited
                ? 'Remove from favorites'
                : 'Add to favorites'
            "
            :aria-pressed="favorited"
            @click="onToggleFavorite(product)"
          >
            <X
              v-if="favoriteAsClose"
              class="product-card__favorite-icon product-card__favorite-icon--close"
              :size="16"
              aria-hidden="true"
            />
            <Heart
              v-else
              class="product-card__favorite-icon product-card__favorite-icon--heart"
              :size="16"
              :fill="favorited ? 'currentColor' : 'none'"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="product-card__quick-view"
            :aria-label="`Quick view ${displayName}`"
            @click="openQuickView"
          >
            <Eye
              class="product-card__quick-view-icon"
              :size="16"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div class="product-card__body">
        <RouterLink
          :to="detailsTo"
          class="product-card__body-link"
          :aria-label="`View ${displayName}`"
        >
          <div class="product-card__meta">
            <p v-if="brandOrCategory" class="product-card__brand">
              {{ brandOrCategory }}
            </p>
            <p
              v-if="!inStock || fewLeft"
              class="product-card__stock"
              aria-live="polite"
            >
              {{ inStock ? "Only few left !" : "Out of stock" }}
            </p>
          </div>

          <h3 class="product-card__title">{{ displayName }}</h3>

          <p v-if="description" class="product-card__description">
            {{ description }}
          </p>
        </RouterLink>

        <RouterLink
          :to="detailsTo"
          class="product-card__body-link product-card__body-link--details"
          :aria-label="`View ${displayName} pricing`"
        >
          <ProductRating
            v-if="hasRating"
            :rating="product.rating"
            :review-count="product.reviewCount"
            :tone="ratingBadgeTone"
            :label="ratingLabel"
          >
            <template #icon>
              <Star
                class="rating-badge__icon"
                :size="14"
                fill="currentColor"
                aria-hidden="true"
              />
            </template>
          </ProductRating>

          <ProductPrice
            :price="displayPrice"
            :original-price="product.originalPrice"
            :show-discount="showDiscount"
            :discount-percent-label="discountPercentLabel"
          />
        </RouterLink>

        <!-- Outside the body link so cart / remove clicks don’t navigate away -->
        <div class="product-card__actions">
          <button
            v-if="hasVariants"
            type="button"
            class="btn btn--primary product-card__cart"
            @click="onSeeAllOptions(product)"
          >
            Select option
          </button>

          <template v-else-if="inStock">
            <button
              type="button"
              class="btn btn--primary product-card__cart"
              @click="onCartCta(product)"
            >
              {{ inCart ? "Go to cart" : "Add to cart" }}
            </button>
          </template>

          <button
            v-else
            type="button"
            class="btn btn--tertiary product-card__options"
            @click="onSeeAllOptions(product)"
          >
            See All Options
          </button>
        </div>
      </div>
    </div>

    <ProductQuickViewDialog
      v-model:open="quickViewOpen"
      :product="product"
      :favorited="favorited"
      @add-to-cart="onQuickViewAddToCart"
      @go-to-cart="emit('go-to-cart', $event)"
      @toggle-favorite="emit('toggle-favorite', $event)"
    />
  </article>
</template>

<style>
@import "@/assets/styles/components/product-card.css";
</style>
