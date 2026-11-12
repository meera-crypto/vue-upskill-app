<script setup>
/**
 * ProductCard — shows ONE product and talks to parents with emit.
 *
 * Base (< md): horizontal row + full-width cart CTA.
 * md+: vertical card with the same cart CTA.
 *
 * Images use <picture>: a <source> picks a smaller URL below md
 * (thumbnail on mobile; primary image as the <img> fallback for md+).
 *
 * Qty +/- and Buy now live on the product detail page. Here, Add to cart
 * adds the item once; the CTA then switches to “Go to cart”.
 * Out of stock: full-width tertiary “See All Options” (opens details).
 * Image + body (brand/title/price/…) link to `/product?id=…&slug=…`;
 * cart / favorite buttons stay outside that link.
 *
 * Variants (when present):
 * - Desktop/hover: options strip over the image — select Color/Size here,
 *   then Add to cart (no details page required).
 * - Mobile: “View all” link under the description (`btn btn--link`).
 *
 * Vue ideas: `selectedOptions` ref + `computed` activeVariant (same pattern
 * as the details page); emit passes (product, variant) to the parent.
 */
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { Heart, Star } from "@lucide/vue";
import {
  COLOR_SWATCH_HEX,
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
} from "@/services/productService.js";
import { mediaQueries } from "@/constants/breakpoints.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import { useCart } from "@/composables/useCart.js";
import { useToast } from "@/composables/useToast.js";
import {
  cartLineKey,
  findVariantByOptions,
  isOptionValueAvailable,
  isVariantSelectionComplete,
  productHasVariants,
  productOptions,
} from "@/utils/variants.js";

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  favorited: {
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

const toast = useToast();
const { isInCart } = useCart();

/**
 * Selected option map for quick view, e.g. `{ Color: "Blue", Size: "M" }`.
 * Replace the whole object on each click so Vue tracks the update.
 */
const selectedOptions = ref(/** @type {Record<string, string>} */ ({}));

watch(
  () => props.product?.id,
  () => {
    selectedOptions.value = {};
  },
);

/** True when this product has size/color (etc.) choices. */
const hasVariants = computed(() => productHasVariants(props.product));

/** Option groups for the hover quick-view strip. */
const optionGroups = computed(() => productOptions(props.product));

const selectionComplete = computed(() =>
  isVariantSelectionComplete(props.product, selectedOptions.value),
);

const activeVariant = computed(() =>
  findVariantByOptions(props.product, selectedOptions.value),
);

const missingOptionNames = computed(() => {
  if (!hasVariants.value) return [];
  return optionGroups.value
    .filter((option) => !selectedOptions.value[option.name])
    .map((option) => option.name);
});

/**
 * CTA “already in cart” — for variants, only the *selected* SKU counts,
 * so a second color/size can still be added as its own line.
 */
const selectedInCart = computed(() => {
  if (!hasVariants.value) return props.quantity > 0;
  if (!activeVariant.value) return false;
  return isInCart(cartLineKey(props.product, activeVariant.value));
});

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
const showDiscount = computed(() => {
  if (activeVariant.value) return false;
  return hasValidDiscount(props.product);
});

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
const ratingBadgeTone = computed(() => getRatingBadgeTone(props.product.rating));

const ratingLabel = computed(() => {
  if (!hasRating.value) return "";
  const score = props.product.rating.toFixed(1);
  const reviews = props.product.reviewCount;
  if (typeof reviews === "number" && reviews > 0) {
    return `${score} out of 5 stars, ${reviews} review${reviews === 1 ? "" : "s"}`;
  }
  return `${score} out of 5 stars`;
});

/** Prefer the selected variant’s image when the overlay mapped one. */
const displayImage = computed(() => {
  const variantImage =
    typeof activeVariant.value?.image === "string"
      ? activeVariant.value.image.trim()
      : "";
  return variantImage || props.product.image;
});

/** Image URL for narrow screens — thumbnail when the API gave a distinct one. */
const mobileImageSrc = computed(() => {
  if (activeVariant.value?.image) return displayImage.value;
  const thumb =
    typeof props.product.thumbnail === "string"
      ? props.product.thumbnail.trim()
      : "";
  return thumb || props.product.image;
});

const displayPrice = computed(() => {
  if (
    activeVariant.value &&
    Number.isFinite(Number(activeVariant.value.price))
  ) {
    return Number(activeVariant.value.price);
  }
  return Number(props.product.price) || 0;
});

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
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
}

/**
 * @param {string} optionName
 * @param {string} optionValue
 */
function optionValueAvailable(optionName, optionValue) {
  return isOptionValueAvailable(
    props.product,
    optionName,
    optionValue,
    selectedOptions.value,
  );
}

/**
 * Color options get a swatch when we know a hex; other groups use text chips.
 * @param {string} optionName
 * @param {string} optionValue
 */
function optionSwatchHex(optionName, optionValue) {
  if (String(optionName).toLowerCase() !== "color") return "";
  const key = String(optionValue).trim().toLowerCase();
  return COLOR_SWATCH_HEX[key] || "";
}

function onAddToCart() {
  if (!inStock.value) return;

  if (hasVariants.value) {
    if (!selectionComplete.value) {
      const missing = missingOptionNames.value.join(" and ");
      toast.info(missing ? `Select ${missing}` : "Select product options");
      return;
    }
    if (!activeVariant.value || (activeVariant.value.stock ?? 0) <= 0) {
      toast.info("This combination is unavailable");
      return;
    }
    emit("add-to-cart", props.product, activeVariant.value);
    return;
  }

  emit("add-to-cart", props.product);
}

/** Primary CTA after add — parent can navigate once a cart route exists. */
function onGoToCart(product) {
  emit("go-to-cart", product);
}

function onCartCta(product) {
  if (selectedInCart.value) {
    onGoToCart(product);
  } else {
    onAddToCart();
  }
}

function onToggleFavorite(product) {
  emit("toggle-favorite", product);
}

/** Opens the product details page (used for out-of-stock CTA / View all). */
function onSeeAllOptions(product) {
  emit("see-all-options", product);
}

/**
 * Details link includes current quick-view picks as `opts` / `variant`
 * query params so the PDP opens with the same selection.
 */
const detailsTo = computed(() =>
  productDetailsTo(props.product, {
    selectedOptions: selectedOptions.value,
  }),
);
</script>

<template>
  <article
    class="product-card"
    :class="{ 'product-card--has-variants': hasVariants }"
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
            <source
              :media="mediaQueries.untilMd"
              :srcset="mobileImageSrc"
            />
            <img
              class="product-card__image"
              :src="displayImage"
              :alt="displayName"
              width="150"
              height="150"
              loading="lazy"
              @error="onImageError"
            />
          </picture>
        </RouterLink>
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

        <!--
          Quick variant selection — over the image bottom on card hover.
          Pick options here, then use Add to cart (no details page needed).
        -->
        <div
          v-if="hasVariants"
          class="product-card__quick-variants"
          aria-label="Available options"
        >
          <div
            v-for="group in optionGroups"
            :key="group.name"
            class="product-card__quick-group"
          >
            <p class="product-card__quick-label">
              {{ group.name }}
              <span
                v-if="selectedOptions[group.name]"
                class="product-card__quick-value"
              >
                {{ selectedOptions[group.name] }}
              </span>
            </p>
            <div class="product-card__quick-values" role="list">
              <button
                v-for="value in group.values"
                :key="`${group.name}-${value}`"
                type="button"
                class="product-card__quick-option"
                :class="{
                  'product-card__quick-option--swatch':
                    !!optionSwatchHex(group.name, value),
                  'product-card__quick-option--selected':
                    selectedOptions[group.name] === value,
                  'product-card__quick-option--unavailable':
                    !optionValueAvailable(group.name, value),
                }"
                :style="
                  optionSwatchHex(group.name, value)
                    ? { '--swatch': optionSwatchHex(group.name, value) }
                    : undefined
                "
                role="listitem"
                :aria-pressed="selectedOptions[group.name] === value"
                :aria-label="`${group.name} ${value}`"
                :title="
                  optionValueAvailable(group.name, value)
                    ? value
                    : `${value} unavailable`
                "
                @click.stop="selectOption(group.name, value)"
              >
                <span
                  v-if="optionSwatchHex(group.name, value)"
                  class="product-card__quick-swatch"
                  aria-hidden="true"
                />
                <span v-else>{{ value }}</span>
              </button>
            </div>
          </div>
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

        <!-- Mobile: below description — opens details to choose all options -->
        <RouterLink
          v-if="hasVariants"
          :to="detailsTo"
          class="btn btn--link product-card__view-all"
        >
          View all
        </RouterLink>

        <RouterLink
          :to="detailsTo"
          class="product-card__body-link product-card__body-link--details"
          :aria-label="`View ${displayName} pricing`"
        >
          <p
            v-if="hasRating"
            class="product-card__rating"
            :class="
              ratingBadgeTone
                ? `product-card__rating--${ratingBadgeTone}`
                : undefined
            "
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
            <p class="product-card__price">${{ displayPrice.toFixed(2) }}</p>
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
        </RouterLink>

        <!-- Outside the body link so cart clicks don’t navigate away -->
        <div class="product-card__actions">
          <template v-if="inStock">
            <button
              type="button"
              class="btn btn--primary product-card__cart"
              @click="onCartCta(product)"
            >
              {{ selectedInCart ? "Go to cart" : "Add to cart" }}
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
  </article>
</template>
