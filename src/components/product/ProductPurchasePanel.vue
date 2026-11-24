<script setup>
/**
 * ProductPurchasePanel — title, price, variants, qty, cart / buy actions.
 *
 * Receives variant selection state from the parent (via useVariantSelection)
 * so Quick View and the details page can share the same composable while
 * keeping different chrome around the buy box.
 */
import { computed, ref, watch } from "vue";
import { Minus, Plus, Star } from "@lucide/vue";
import { hasValidDiscount } from "@/utils/productModel.js";
import { getRatingBadgeTone } from "@/utils/ratingBadge.js";
import { formatSelectedOptions } from "@/utils/variants.js";
import ProductRating from "@/components/product/ProductRating.vue";

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  brandOrCategory: {
    type: String,
    default: "",
  },
  selectedOptions: {
    type: Object,
    required: true,
  },
  hasVariants: {
    type: Boolean,
    default: false,
  },
  optionGroups: {
    type: Array,
    default: () => [],
  },
  activeVariant: {
    type: Object,
    default: null,
  },
  productHasStock: {
    type: Boolean,
    default: false,
  },
  canPurchase: {
    type: Boolean,
    default: false,
  },
  showNotifyMe: {
    type: Boolean,
    default: false,
  },
  inStock: {
    type: Boolean,
    default: false,
  },
  maxQuantity: {
    type: Number,
    default: 1,
  },
  displayPrice: {
    type: Number,
    required: true,
  },
  selectionHint: {
    type: String,
    default: "",
  },
  fewLeft: {
    type: Boolean,
    default: false,
  },
  canCompare: {
    type: Boolean,
    default: false,
  },
  optionValueAvailable: {
    type: Function,
    required: true,
  },
  optionSwatchHex: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  "select-option",
  "add-to-cart",
  "buy-now",
  "notify-me",
  "open-compare",
]);

const quantityInput = ref("1");

const showDiscount = computed(() => hasValidDiscount(props.product));

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

const resolvedQuantity = computed(() => {
  const raw = String(quantityInput.value).trim();
  if (!raw) return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(props.maxQuantity, n);
});

const canDecreaseQty = computed(() => (resolvedQuantity.value ?? 1) > 1);
const canIncreaseQty = computed(
  () => (resolvedQuantity.value ?? 0) < props.maxQuantity,
);

const displaySku = computed(() => {
  if (props.activeVariant?.sku) return String(props.activeVariant.sku);
  return props.product?.sku ? String(props.product.sku) : "";
});

const infoRows = computed(() => {
  /** @type {{ label: string, value: string }[]} */
  const rows = [];
  if (displaySku.value) rows.push({ label: "SKU", value: displaySku.value });
  const selectedLabel = formatSelectedOptions(props.selectedOptions);
  if (selectedLabel) {
    rows.push({ label: "Selected", value: selectedLabel });
  }
  if (props.product.availabilityStatus) {
    rows.push({
      label: "Availability",
      value: props.product.availabilityStatus,
    });
  }
  if (props.product.shippingInformation) {
    rows.push({
      label: "Shipping",
      value: props.product.shippingInformation,
    });
  }
  if (props.product.warrantyInformation) {
    rows.push({
      label: "Warranty",
      value: props.product.warrantyInformation,
    });
  }
  if (props.product.returnPolicy) {
    rows.push({ label: "Returns", value: props.product.returnPolicy });
  }
  return rows;
});

watch(
  () => props.product?.id,
  () => {
    quantityInput.value = "1";
  },
);

watch(
  () => props.maxQuantity,
  (max) => {
    const n = Math.floor(Number(quantityInput.value));
    if (Number.isFinite(n) && n > max) {
      quantityInput.value = String(max);
    }
  },
);

/**
 * @param {number} n
 */
function setQtyInput(n) {
  const clamped = Math.min(props.maxQuantity, Math.max(1, Math.floor(n)));
  quantityInput.value = String(clamped);
}

function decreaseQty() {
  setQtyInput((resolvedQuantity.value ?? 1) - 1);
}

function increaseQty() {
  setQtyInput((resolvedQuantity.value ?? 0) + 1);
}

function onQtyBlur() {
  const qty = resolvedQuantity.value;
  quantityInput.value = String(qty == null ? 1 : qty);
}

/**
 * @returns {number | null}
 */
function quantityForCart() {
  return resolvedQuantity.value;
}

defineExpose({ quantityForCart });

/**
 * @param {string} optionName
 * @param {string} optionValue
 */
function onSelectOption(optionName, optionValue) {
  emit("select-option", optionName, optionValue);
}

function onAddToCart() {
  emit("add-to-cart", quantityForCart());
}

function onBuyOrNotify() {
  if (props.showNotifyMe) {
    emit("notify-me");
    return;
  }
  emit("buy-now", quantityForCart());
}
</script>

<template>
  <section class="product-details__info" aria-labelledby="product-title">
    <p v-if="brandOrCategory" class="product-details__brand">
      {{ brandOrCategory }}
    </p>

    <h1 id="product-title" class="product-details__title">
      {{ displayName }}
    </h1>

    <ProductRating
      v-if="hasRating"
      size="lg"
      :rating="product.rating"
      :review-count="product.reviewCount"
      :tone="ratingBadgeTone"
      :label="ratingLabel"
    >
      <template #icon>
        <Star
          class="rating-badge__icon"
          :size="16"
          fill="currentColor"
          aria-hidden="true"
        />
      </template>
    </ProductRating>

    <div class="product-details__pricing">
      <p class="product-details__price">${{ displayPrice.toFixed(2) }}</p>
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
        'product-details__stock--low': fewLeft && canPurchase,
      }"
      aria-live="polite"
    >
      <template v-if="!productHasStock">Out of stock</template>
      <template v-else-if="selectionHint && hasVariants">
        {{ selectionHint }}
      </template>
      <template v-else-if="fewLeft && canPurchase">Only a few left</template>
      <template v-else>In stock</template>
    </p>

    <p v-if="product.description" class="product-details__description">
      {{ product.description }}
    </p>

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
        <p class="product-details__option-label" :id="`option-${group.name}`">
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
              'product-details__option--unavailable': !optionValueAvailable(
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
            @click="onSelectOption(group.name, value)"
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

    <div class="product-details__buy-box">
      <div class="product-details__purchase-row">
        <div class="product-details__qty">
          <span id="product-qty-label" class="product-details__qty-label">
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
        :disabled="showNotifyMe ? false : !canPurchase"
        @click="onBuyOrNotify"
      >
        {{ showNotifyMe ? "Notify me" : "Buy now" }}
      </button>
    </div>

    <button
      v-if="canCompare"
      type="button"
      class="btn btn--secondary product-details__compare-btn"
      @click="emit('open-compare')"
    >
      Compare with similar
    </button>

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
</template>
