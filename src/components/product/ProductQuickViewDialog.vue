<script setup>
/**
 * ProductQuickViewDialog — modal preview from the card Eye button.
 *
 * Variant / purchase readiness comes from `useVariantSelection` — the same
 * composable the details page uses — so option rules stay in one place.
 */
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { ChevronLeft, ChevronRight, Heart, Star, X } from "@lucide/vue";
import {
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
} from "@/utils/productModel.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import { useCart } from "@/composables/useCart.js";
import { useToast } from "@/composables/useToast.js";
import { useFocusTrap } from "@/composables/useFocusTrap.js";
import { useVariantSelection } from "@/composables/useVariantSelection.js";
import { cartLineKey } from "@/utils/variants.js";
import ProductPrice from "@/components/product/ProductPrice.vue";
import ProductRating from "@/components/product/ProductRating.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  product: {
    type: Object,
    required: true,
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  /** Option map from the card when the dialog opens (may be empty). */
  initialOptions: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "update:open",
  "add-to-cart",
  "go-to-cart",
  "toggle-favorite",
]);

const toast = useToast();
const { isInCart } = useCart();

const dialogEl = ref(/** @type {HTMLElement | null} */ (null));
const selectedImageIndex = ref(0);

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

useFocusTrap(dialogEl, isOpen, {
  onEscape: close,
});

const {
  selectedOptions,
  hasVariants,
  optionGroups,
  selectionComplete,
  activeVariant,
  productHasStock,
  inStock,
  displayPrice,
  missingOptionNames,
  fewLeft,
  setOptions,
  selectOption,
  optionValueAvailable,
  optionSwatchHex,
  ensureVariantReady,
} = useVariantSelection(() => props.product);

const displayName = computed(
  () => props.product?.title || props.product?.name || "Untitled product",
);

const brandOrCategory = computed(() => {
  const brand =
    typeof props.product?.brand === "string" ? props.product.brand.trim() : "";
  if (brand) return brand;

  const label =
    typeof props.product?.categoryLabel === "string"
      ? props.product.categoryLabel.trim()
      : "";
  if (label) return label;

  const category =
    typeof props.product?.category === "string"
      ? props.product.category.trim()
      : "";
  return category;
});

const description = computed(() => {
  const text = props.product?.description;
  return typeof text === "string" ? text.trim() : "";
});

const showDiscount = computed(() => {
  if (activeVariant.value) return false;
  return hasValidDiscount(props.product);
});

const discountPercentLabel = computed(() => {
  if (!showDiscount.value) return "";
  return `${Math.round(Number(props.product.discountPercentage))}% off`;
});

const hasRating = computed(() => typeof props.product?.rating === "number");

const ratingBadgeTone = computed(() =>
  getRatingBadgeTone(props.product?.rating),
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

const galleryImages = computed(() => {
  const raw = Array.isArray(props.product?.images) ? props.product.images : [];
  /** @type {string[]} */
  const list = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const url = entry.trim();
    if (url && !list.includes(url)) list.push(url);
  }
  const primary =
    typeof props.product?.image === "string" ? props.product.image.trim() : "";
  if (primary && !list.includes(primary)) list.unshift(primary);
  if (list.length === 0) {
    const thumb =
      typeof props.product?.thumbnail === "string"
        ? props.product.thumbnail.trim()
        : "";
    if (thumb) list.push(thumb);
  }
  return list.length > 0 ? list : [PRODUCT_IMAGE_FALLBACK];
});

const canShowGalleryArrows = computed(() => galleryImages.value.length > 1);
const canGoPrevImage = computed(() => selectedImageIndex.value > 0);
const canGoNextImage = computed(
  () => selectedImageIndex.value < galleryImages.value.length - 1,
);

const displayImage = computed(
  () =>
    galleryImages.value[selectedImageIndex.value] ??
    galleryImages.value[0] ??
    PRODUCT_IMAGE_FALLBACK,
);

const selectedInCart = computed(() => {
  if (!hasVariants.value) {
    return isInCart(cartLineKey(props.product, null));
  }
  if (!activeVariant.value) return false;
  return isInCart(cartLineKey(props.product, activeVariant.value));
});

const detailsTo = computed(() =>
  productDetailsTo(props.product, {
    selectedOptions: selectedOptions.value,
  }),
);

const stockLabel = computed(() => {
  if (!productHasStock.value) return "Out of stock";
  if (hasVariants.value && !selectionComplete.value) {
    const missing = missingOptionNames.value.join(" and ");
    return missing ? `Select ${missing}` : "Select options";
  }
  if (hasVariants.value && activeVariant.value && !inStock.value) {
    return "This combination is unavailable";
  }
  if (fewLeft.value) return "Only a few left";
  return "In stock";
});

watch(
  () => props.open,
  async (open) => {
    if (open) {
      setOptions(props.initialOptions || {});
      selectedImageIndex.value = 0;
      document.body.style.overflow = "hidden";
      await nextTick();
      return;
    }
    document.body.style.overflow = "";
  },
);

watch(
  () => props.product?.id,
  () => {
    if (props.open) {
      setOptions(props.initialOptions || {});
      selectedImageIndex.value = 0;
    }
  },
);

watch(activeVariant, (variant) => {
  if (!variant || !props.open) return;
  const index = Number(variant.imageIndex);
  if (
    Number.isFinite(index) &&
    index >= 0 &&
    index < galleryImages.value.length
  ) {
    selectedImageIndex.value = index;
    return;
  }
  const variantImage =
    typeof variant.image === "string" ? variant.image.trim() : "";
  if (!variantImage) return;
  const match = galleryImages.value.indexOf(variantImage);
  if (match >= 0) selectedImageIndex.value = match;
});

onUnmounted(() => {
  document.body.style.overflow = "";
});

function close() {
  isOpen.value = false;
}

function onBackdropClick(event) {
  if (event.target === event.currentTarget) close();
}

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function goToPrevImage() {
  if (!canGoPrevImage.value) return;
  selectedImageIndex.value -= 1;
}

function goToNextImage() {
  if (!canGoNextImage.value) return;
  selectedImageIndex.value += 1;
}

function onAddToCart() {
  if (!productHasStock.value) return;

  const ready = ensureVariantReady();
  if (!ready.ok) {
    toast.info(ready.message);
    return;
  }

  if (hasVariants.value) {
    emit("add-to-cart", props.product, activeVariant.value);
    return;
  }

  emit("add-to-cart", props.product);
}

function onCartCta() {
  if (selectedInCart.value) {
    emit("go-to-cart", props.product);
    close();
    return;
  }
  onAddToCart();
}

function onToggleFavorite() {
  emit("toggle-favorite", props.product);
}

function onViewDetails() {
  close();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="quick-view"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        ref="dialogEl"
        class="quick-view__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        tabindex="-1"
      >
        <button
          type="button"
          class="quick-view__close"
          aria-label="Close quick view"
          @click="close"
        >
          <X :size="22" aria-hidden="true" />
        </button>

        <div class="quick-view__main">
          <div class="quick-view__media">
            <img
              class="quick-view__image"
              :src="displayImage"
              :alt="displayName"
              width="360"
              height="360"
              @error="onImageError"
            />
            <template v-if="canShowGalleryArrows">
              <button
                type="button"
                class="quick-view__gallery-arrow quick-view__gallery-arrow--prev"
                :disabled="!canGoPrevImage"
                aria-label="Previous image"
                @click="goToPrevImage"
              >
                <ChevronLeft :size="24" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="quick-view__gallery-arrow quick-view__gallery-arrow--next"
                :disabled="!canGoNextImage"
                aria-label="Next image"
                @click="goToNextImage"
              >
                <ChevronRight :size="24" aria-hidden="true" />
              </button>
            </template>
          </div>

          <div class="quick-view__body">
            <div class="quick-view__meta">
              <p v-if="brandOrCategory" class="quick-view__brand">
                {{ brandOrCategory }}
              </p>
              <p class="quick-view__stock" role="status">{{ stockLabel }}</p>
            </div>

            <div class="quick-view__title-row">
              <h2 id="quick-view-title" class="quick-view__title">
                {{ displayName }}
              </h2>
              <button
                type="button"
                class="quick-view__favorite"
                :class="{ 'quick-view__favorite--active': favorited }"
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

            <p v-if="description" class="quick-view__description">
              {{ description }}
            </p>

            <div
              v-if="hasVariants"
              class="quick-view__variants"
              aria-label="Product options"
            >
              <div
                v-for="group in optionGroups"
                :key="group.name"
                class="quick-view__option-group"
              >
                <p
                  class="quick-view__option-label"
                  :id="`quick-view-option-${group.name}`"
                >
                  {{ group.name }}
                  <span
                    v-if="selectedOptions[group.name]"
                    class="quick-view__option-value"
                  >
                    {{ selectedOptions[group.name] }}
                  </span>
                </p>
                <div
                  class="quick-view__option-values"
                  role="group"
                  :aria-labelledby="`quick-view-option-${group.name}`"
                >
                  <button
                    v-for="value in group.values"
                    :key="`${group.name}-${value}`"
                    type="button"
                    class="quick-view__option"
                    :class="{
                      'quick-view__option--selected':
                        selectedOptions[group.name] === value,
                      'quick-view__option--swatch': !!optionSwatchHex(
                        group.name,
                        value,
                      ),
                      'quick-view__option--unavailable': !optionValueAvailable(
                        group.name,
                        value,
                      ),
                    }"
                    :style="
                      optionSwatchHex(group.name, value)
                        ? { '--swatch': optionSwatchHex(group.name, value) }
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
                      class="quick-view__swatch"
                      aria-hidden="true"
                    />
                    <span v-else>{{ value }}</span>
                  </button>
                </div>
              </div>
            </div>

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
          </div>
        </div>

        <div class="quick-view__actions">
          <button
            v-if="productHasStock"
            type="button"
            class="btn btn--primary quick-view__cart"
            @click="onCartCta"
          >
            {{ selectedInCart ? "Go to cart" : "Add to cart" }}
          </button>
          <RouterLink
            :to="detailsTo"
            class="btn btn--link quick-view__details"
            @click="onViewDetails"
          >
            View full details
          </RouterLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@import "@/assets/styles/components/quick-view-dialog.css";
</style>
