<script setup>
/**
 * ProductCard — shows ONE product and talks to parents with emit.
 *
 * Mobile: horizontal row (image left, details right) + full-width cart CTA.
 * Desktop: vertical card with cart CTA / Buy now.
 *
 * Qty +/- lives on the product detail page later. Here, Add to cart adds the
 * item once; the CTA then switches to “Go to cart”.
 */
import { computed } from "vue";
import { Heart, Star } from "@lucide/vue";
import { PRODUCT_IMAGE_FALLBACK } from "@/services/productService.js";

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  /** Cart quantity from parent — used only to know if this item is already added. */
  quantity: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  "add-to-cart",
  "go-to-cart",
  "buy-now",
  "toggle-favorite",
]);

/** True once this product is in the cart (qty comes from the parent). */
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

const showDiscount = computed(() => {
  const original = props.product.originalPrice;
  return (
    typeof original === "number" &&
    original > props.product.price &&
    props.product.price >= 0
  );
});

/** Low stock hint only — never show the exact count. */
const fewLeft = computed(
  () => inStock.value && (props.product.stock ?? 0) < 30,
);

/** Rounded % off from DummyJSON (only when a valid discount is shown). */
const discountPercentLabel = computed(() => {
  if (!showDiscount.value) return "";
  const percent = Number(props.product.discountPercentage);
  if (!Number.isFinite(percent) || percent <= 0) return "";
  return `${Math.round(percent)}% off`;
});

/** Only show rating when the API gave us a real number — never invent stars. */
const hasRating = computed(() => typeof props.product.rating === "number");

const ratingLabel = computed(() => {
  if (!hasRating.value) return "";
  const score = props.product.rating.toFixed(1);
  const reviews = props.product.reviewCount;
  if (typeof reviews === "number" && reviews > 0) {
    return `${score} out of 5 stars, ${reviews} review${reviews === 1 ? "" : "s"}`;
  }
  return `${score} out of 5 stars`;
});

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function onAddToCart(product) {
  if (!inStock.value) return;
  emit("add-to-cart", product);
}

/** Primary CTA after add — parent can navigate once a cart route exists. */
function onGoToCart(product) {
  emit("go-to-cart", product);
}

function onBuyNow(product) {
  if (!inStock.value) return;
  emit("buy-now", product);
}

function onCartCta(product) {
  if (inCart.value) {
    onGoToCart(product);
  } else {
    onAddToCart(product);
  }
}

function onToggleFavorite(product) {
  emit("toggle-favorite", product);
}
</script>

<template>
  <article class="product-card">
    <div class="product-card__main">
      <div class="product-card__media">
        <img
          class="product-card__image"
          :src="product.image"
          :alt="displayName"
          width="150"
          height="150"
          loading="lazy"
          @error="onImageError"
        />
        <button
          type="button"
          class="product-card__favorite"
          :class="{ 'product-card__favorite--active': favorited }"
          :aria-label="favorited ? 'Remove from favorites' : 'Add to favorites'"
          :aria-pressed="favorited"
          @click="onToggleFavorite(product)"
        >
          <Heart :size="16" :fill="favorited ? 'currentColor' : 'none'" />
        </button>
      </div>

      <div class="product-card__body">
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

        <p
          v-if="hasRating"
          class="product-card__rating"
          :aria-label="ratingLabel"
        >
          <Star
            class="product-card__rating-icon"
            :size="14"
            fill="currentColor"
            aria-hidden="true"
          />
          <span class="product-card__rating-score">
            {{ product.rating.toFixed(1) }}
          </span>
          <span
            v-if="product.reviewCount"
            class="product-card__rating-count"
          >
            ({{ product.reviewCount }})
          </span>
        </p>

        <div class="product-card__pricing">
          <p class="product-card__price">${{ product.price.toFixed(2) }}</p>
          <p
            v-if="showDiscount"
            class="product-card__price product-card__price--original"
          >
            ${{ product.originalPrice.toFixed(2) }}
          </p>
          <p v-if="discountPercentLabel" class="product-card__offer">
            {{ discountPercentLabel }}
          </p>
        </div>

        <!-- Lives in the content column so mobile width matches details, not image -->
        <div v-if="inStock" class="product-card__actions">
          <button
            type="button"
            class="btn btn--primary product-card__cart"
            @click="onCartCta(product)"
          >
            {{ inCart ? "Go to cart" : "Add to cart" }}
          </button>

          <button
            type="button"
            class="btn btn--tertiary product-card__buy"
            @click="onBuyNow(product)"
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
