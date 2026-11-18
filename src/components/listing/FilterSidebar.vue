<script setup>
/**
 * FilterSidebar — left-hand e-commerce filters.
 *
 * Each filter group is a collapsible accordion via shared `FilterGroup`.
 * Open state lives in a reactive object so several sections can stay open.
 *
 * Categories live in the header strip (not here).
 * Vue idea: `reactive({ price: true, … })` tracks open/closed per section;
 * FilterGroup uses `v-show` so checkbox state is kept while closed.
 */
import { reactive, computed } from "vue";
import FilterGroup from "@/components/listing/FilterGroup.vue";

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  priceBounds: {
    type: Object,
    required: true,
  },
  /** When true, render as an open mobile drawer panel. */
  drawerOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-brand",
  "toggle-color",
  "toggle-size",
  "toggle-rating",
  "toggle-discount",
  "toggle-in-stock",
  "update:price-min",
  "update:price-max",
  "clear",
  "close",
]);

/** Which filter sections are expanded. Start with Price open; lists closed. */
const openSections = reactive({
  price: true,
  availability: true,
  brand: false,
  rating: false,
  color: false,
  size: false,
  discount: false,
});

function toggleSection(key) {
  openSections[key] = !openSections[key];
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const priceMinLabel = computed(() =>
  priceFormatter.format(props.filters.priceMin ?? 0),
);
const priceMaxLabel = computed(() =>
  priceFormatter.format(props.filters.priceMax ?? 0),
);

/**
 * CSS custom props for the highlighted span between the two thumbs
 * on one shared track.
 */
const priceFillStyle = computed(() => {
  const { min, max } = props.priceBounds;
  const span = max - min || 1;
  const left = ((props.filters.priceMin - min) / span) * 100;
  const right = ((props.filters.priceMax - min) / span) * 100;
  return {
    "--price-fill-left": `${left}%`,
    "--price-fill-right": `${100 - right}%`,
  };
});

/**
 * Clamp a typed/slid price into [bounds.min, bounds.max] and keep
 * min ≤ max. Shared by the dual-range thumbs and the number fields.
 */
function clampPriceMin(raw) {
  const { min, max } = props.priceBounds;
  let value = Number(raw);
  if (!Number.isFinite(value)) value = props.filters.priceMin;
  return Math.min(Math.max(value, min), Math.min(props.filters.priceMax, max));
}

function clampPriceMax(raw) {
  const { min, max } = props.priceBounds;
  let value = Number(raw);
  if (!Number.isFinite(value)) value = props.filters.priceMax;
  return Math.max(Math.min(value, max), Math.max(props.filters.priceMin, min));
}

function onPriceMinInput(event) {
  emit("update:price-min", clampPriceMin(event.target.value));
}

function onPriceMaxInput(event) {
  emit("update:price-max", clampPriceMax(event.target.value));
}

/**
 * Number fields commit on `change` (blur / Enter) so partial typing
 * is not clamped mid-keystroke. Re-assigning the input value after
 * emit resets invalid/out-of-range text to the clamped filter value.
 */
function onPriceMinChange(event) {
  const next = clampPriceMin(event.target.value);
  emit("update:price-min", next);
  event.target.value = String(next);
}

function onPriceMaxChange(event) {
  const next = clampPriceMax(event.target.value);
  emit("update:price-max", next);
  event.target.value = String(next);
}

function isColorSelected(value) {
  return props.filters.colors.includes(value);
}

function isSizeSelected(value) {
  return props.filters.sizes.includes(value);
}

/** Small count badge on the header when that group has selections. */
function selectedCount(key) {
  switch (key) {
    case "brand":
      return props.filters.brands.length;
    case "color":
      return props.filters.colors.length;
    case "size":
      return props.filters.sizes.length;
    case "rating":
      return props.filters.ratings.length;
    case "discount":
      return props.filters.discounts.length;
    case "availability":
      return props.filters.inStockOnly ? 1 : 0;
    case "price": {
      const { min, max } = props.priceBounds;
      return props.filters.priceMin > min || props.filters.priceMax < max
        ? 1
        : 0;
    }
    default:
      return 0;
  }
}
</script>

<template>
  <aside
    class="filter-sidebar"
    :class="{ 'filter-sidebar--open': drawerOpen }"
    aria-label="Product filters"
    :tabindex="drawerOpen ? -1 : undefined"
  >
    <div class="filter-sidebar__header">
      <h2 class="filter-sidebar__title">Filters</h2>
      <button
        type="button"
        class="filter-sidebar__close"
        aria-label="Close filters"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <FilterGroup
      title="Price"
      section-id="price"
      :open="openSections.price"
      :count="selectedCount('price')"
      @toggle="toggleSection('price')"
    >
      <!--
        Min/max number fields + dual-range slider share the same filter
        state. Typing commits on change; dragging updates live via @input.
        `.filter-price` min-height reserves space while bounds hydrate.
      -->
      <div class="filter-price">
        <div class="filter-price__inputs" aria-live="polite">
          <div class="filter-price__field">
            <label class="filter-price__label" for="filter-price-min-input"
              >Min</label
            >
            <div class="filter-price__input-wrap">
              <span class="filter-price__prefix" aria-hidden="true">$</span>
              <input
                id="filter-price-min-input"
                type="number"
                class="filter-price__input"
                :min="priceBounds.min"
                :max="filters.priceMax"
                :step="1"
                :value="filters.priceMin"
                :aria-valuetext="priceMinLabel"
                inputmode="numeric"
                @change="onPriceMinChange"
              />
            </div>
          </div>
          <span class="filter-price__separator" aria-hidden="true">–</span>
          <div class="filter-price__field">
            <label class="filter-price__label" for="filter-price-max-input"
              >Max</label
            >
            <div class="filter-price__input-wrap">
              <span class="filter-price__prefix" aria-hidden="true">$</span>
              <input
                id="filter-price-max-input"
                type="number"
                class="filter-price__input"
                :min="filters.priceMin"
                :max="priceBounds.max"
                :step="1"
                :value="filters.priceMax"
                :aria-valuetext="priceMaxLabel"
                inputmode="numeric"
                @change="onPriceMaxChange"
              />
            </div>
          </div>
        </div>
        <div class="filter-price__control" :style="priceFillStyle">
          <div class="filter-price__track" aria-hidden="true">
            <div class="filter-price__fill" />
          </div>
          <label class="visually-hidden" for="filter-price-min"
            >Minimum price slider</label
          >
          <input
            id="filter-price-min"
            type="range"
            class="filter-price__range filter-price__range--min"
            :min="priceBounds.min"
            :max="priceBounds.max"
            :value="filters.priceMin"
            :step="1"
            @input="onPriceMinInput"
          />
          <label class="visually-hidden" for="filter-price-max"
            >Maximum price slider</label
          >
          <input
            id="filter-price-max"
            type="range"
            class="filter-price__range filter-price__range--max"
            :min="priceBounds.min"
            :max="priceBounds.max"
            :value="filters.priceMax"
            :step="1"
            @input="onPriceMaxInput"
          />
        </div>
      </div>
    </FilterGroup>

    <FilterGroup
      title="Availability"
      section-id="availability"
      :open="openSections.availability"
      :count="selectedCount('availability')"
      @toggle="toggleSection('availability')"
    >
      <ul class="filter-group__list">
        <li>
          <label class="filter-option">
            <input
              type="checkbox"
              class="filter-option__input"
              :checked="filters.inStockOnly"
              @change="emit('toggle-in-stock')"
            />
            <span class="filter-option__label">In stock</span>
          </label>
        </li>
      </ul>
    </FilterGroup>

    <FilterGroup
      title="Brand"
      section-id="brand"
      :open="openSections.brand"
      :count="selectedCount('brand')"
      @toggle="toggleSection('brand')"
    >
      <p v-if="options.brands.length === 0" class="filter-group__empty">
        No brands found
      </p>
      <ul v-else class="filter-group__list filter-group__list--scroll">
        <li v-for="brand in options.brands" :key="brand">
          <label class="filter-option">
            <input
              type="checkbox"
              class="filter-option__input"
              :checked="filters.brands.includes(brand)"
              @change="emit('toggle-brand', brand)"
            />
            <span class="filter-option__label">{{ brand }}</span>
          </label>
        </li>
      </ul>
    </FilterGroup>

    <FilterGroup
      title="Customer rating"
      section-id="rating"
      :open="openSections.rating"
      :count="selectedCount('rating')"
      @toggle="toggleSection('rating')"
    >
      <ul class="filter-group__list">
        <li v-for="rating in options.ratings" :key="rating.value">
          <label class="filter-option">
            <input
              type="checkbox"
              class="filter-option__input"
              :checked="filters.ratings.includes(rating.value)"
              @change="emit('toggle-rating', rating.value)"
            />
            <span class="filter-option__label">{{ rating.label }}</span>
          </label>
        </li>
      </ul>
    </FilterGroup>

    <!--
      Always mounted (like Brand) so the accordion does not insert between
      Rating and Discount after the catalog loads — that was a layout shift.
    -->
    <FilterGroup
      title="Color"
      section-id="color"
      :open="openSections.color"
      :count="selectedCount('color')"
      @toggle="toggleSection('color')"
    >
      <p v-if="options.colors.length === 0" class="filter-group__empty">
        No colors found
      </p>
      <ul v-else class="filter-colors" role="list">
        <li v-for="color in options.colors" :key="color.value">
          <button
            type="button"
            class="filter-color"
            :class="{
              'filter-color--selected': isColorSelected(color.value),
            }"
            :style="{ '--swatch': color.hex }"
            :aria-pressed="isColorSelected(color.value)"
            :aria-label="color.label"
            :title="color.label"
            @click="emit('toggle-color', color.value)"
          />
        </li>
      </ul>
    </FilterGroup>

    <!--
      Always mounted (like Color). Options are scoped to the selected
      category when one is active; empty → “No sizes found” (categories
      without Size variants simply have nothing to pick).
    -->
    <FilterGroup
      title="Size"
      section-id="size"
      :open="openSections.size"
      :count="selectedCount('size')"
      @toggle="toggleSection('size')"
    >
      <p v-if="(options.sizes ?? []).length === 0" class="filter-group__empty">
        No sizes found
      </p>
      <ul v-else class="filter-sizes" role="list">
        <li v-for="size in options.sizes" :key="size">
          <button
            type="button"
            class="filter-size"
            :class="{ 'filter-size--selected': isSizeSelected(size) }"
            :aria-pressed="isSizeSelected(size)"
            @click="emit('toggle-size', size)"
          >
            {{ size }}
          </button>
        </li>
      </ul>
    </FilterGroup>

    <FilterGroup
      title="Discount"
      section-id="discount"
      :open="openSections.discount"
      :count="selectedCount('discount')"
      @toggle="toggleSection('discount')"
    >
      <ul class="filter-group__list">
        <li v-for="discount in options.discounts" :key="discount.value">
          <label class="filter-option">
            <input
              type="checkbox"
              class="filter-option__input"
              :checked="filters.discounts.includes(discount.value)"
              @change="emit('toggle-discount', discount.value)"
            />
            <span class="filter-option__label">{{ discount.label }}</span>
          </label>
        </li>
      </ul>
    </FilterGroup>

    <button
      type="button"
      class="btn btn--tertiary filter-sidebar__clear"
      @click="emit('clear')"
    >
      Clear all filters
    </button>
  </aside>
</template>
