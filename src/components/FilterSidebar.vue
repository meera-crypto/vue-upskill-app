<script setup>
/**
 * FilterSidebar — left-hand e-commerce filters.
 *
 * Each filter group is a collapsible “drawer” (accordion):
 * click the header to expand/collapse. Open state lives in a reactive
 * object so several sections can stay open at once (typical shop UX).
 *
 * Categories live in the header strip (not here).
 * Vue idea: `reactive({ price: true, … })` tracks open/closed per
 * section; the template uses `v-show` so checkbox state is kept while closed.
 */
import { reactive, computed } from "vue";
import { ChevronDown } from "@lucide/vue";

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
  "toggle-rating",
  "toggle-discount",
  "update:price-min",
  "update:price-max",
  "clear",
  "close",
]);

/** Which filter sections are expanded. Start with Price open; lists closed. */
const openSections = reactive({
  price: true,
  brand: false,
  rating: false,
  color: false,
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

function onPriceMinInput(event) {
  const value = Number(event.target.value);
  const next = Math.min(value, props.filters.priceMax);
  emit("update:price-min", next);
}

function onPriceMaxInput(event) {
  const value = Number(event.target.value);
  const next = Math.max(value, props.filters.priceMin);
  emit("update:price-max", next);
}

function isColorSelected(value) {
  return props.filters.colors.includes(value);
}

/** Small count badge on the header when that group has selections. */
function selectedCount(key) {
  switch (key) {
    case "brand":
      return props.filters.brands.length;
    case "color":
      return props.filters.colors.length;
    case "rating":
      return props.filters.ratings.length;
    case "discount":
      return props.filters.discounts.length;
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

    <!-- Price -->
    <section class="filter-group">
      <h3 class="filter-group__heading">
        <button
          type="button"
          class="filter-group__toggle"
          :aria-expanded="openSections.price"
          aria-controls="filter-panel-price"
          id="filter-price-heading"
          @click="toggleSection('price')"
        >
          <span class="filter-group__toggle-label">
            Price
            <span v-if="selectedCount('price')" class="filter-group__count">
              {{ selectedCount("price") }}
            </span>
          </span>
          <ChevronDown
            class="filter-group__chevron"
            :class="{ 'filter-group__chevron--open': openSections.price }"
            :size="18"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        v-show="openSections.price"
        id="filter-panel-price"
        class="filter-group__panel"
        role="region"
        aria-labelledby="filter-price-heading"
      >
        <p class="filter-price__values" aria-live="polite">
          {{ priceMinLabel }} – {{ priceMaxLabel }}
        </p>
        <!--
          One visual slider, two thumbs: both range inputs sit on the same
          track. CSS hides their native tracks; only the thumbs receive clicks.
        -->
        <div class="filter-price__control" :style="priceFillStyle">
          <div class="filter-price__track" aria-hidden="true">
            <div class="filter-price__fill" />
          </div>
          <label class="visually-hidden" for="filter-price-min"
            >Minimum price</label
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
            >Maximum price</label
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
    </section>

    <!-- Brand -->
    <section class="filter-group">
      <h3 class="filter-group__heading">
        <button
          type="button"
          class="filter-group__toggle"
          :aria-expanded="openSections.brand"
          aria-controls="filter-panel-brand"
          id="filter-brand-heading"
          @click="toggleSection('brand')"
        >
          <span class="filter-group__toggle-label">
            Brand
            <span v-if="selectedCount('brand')" class="filter-group__count">
              {{ selectedCount("brand") }}
            </span>
          </span>
          <ChevronDown
            class="filter-group__chevron"
            :class="{ 'filter-group__chevron--open': openSections.brand }"
            :size="18"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        v-show="openSections.brand"
        id="filter-panel-brand"
        class="filter-group__panel"
        role="region"
        aria-labelledby="filter-brand-heading"
      >
        <ul class="filter-group__list filter-group__list--scroll">
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
      </div>
    </section>

    <!-- Customer rating -->
    <section class="filter-group">
      <h3 class="filter-group__heading">
        <button
          type="button"
          class="filter-group__toggle"
          :aria-expanded="openSections.rating"
          aria-controls="filter-panel-rating"
          id="filter-rating-heading"
          @click="toggleSection('rating')"
        >
          <span class="filter-group__toggle-label">
            Customer rating
            <span v-if="selectedCount('rating')" class="filter-group__count">
              {{ selectedCount("rating") }}
            </span>
          </span>
          <ChevronDown
            class="filter-group__chevron"
            :class="{ 'filter-group__chevron--open': openSections.rating }"
            :size="18"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        v-show="openSections.rating"
        id="filter-panel-rating"
        class="filter-group__panel"
        role="region"
        aria-labelledby="filter-rating-heading"
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
      </div>
    </section>

    <!-- Color palette -->
    <section v-if="options.colors.length > 0" class="filter-group">
      <h3 class="filter-group__heading">
        <button
          type="button"
          class="filter-group__toggle"
          :aria-expanded="openSections.color"
          aria-controls="filter-panel-color"
          id="filter-color-heading"
          @click="toggleSection('color')"
        >
          <span class="filter-group__toggle-label">
            Color
            <span v-if="selectedCount('color')" class="filter-group__count">
              {{ selectedCount("color") }}
            </span>
          </span>
          <ChevronDown
            class="filter-group__chevron"
            :class="{ 'filter-group__chevron--open': openSections.color }"
            :size="18"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        v-show="openSections.color"
        id="filter-panel-color"
        class="filter-group__panel"
        role="region"
        aria-labelledby="filter-color-heading"
      >
        <ul class="filter-colors" role="list">
          <li v-for="color in options.colors" :key="color.value">
            <button
              type="button"
              class="filter-color"
              :class="{ 'filter-color--selected': isColorSelected(color.value) }"
              :style="{ '--swatch': color.hex }"
              :aria-pressed="isColorSelected(color.value)"
              :aria-label="color.label"
              :title="color.label"
              @click="emit('toggle-color', color.value)"
            />
          </li>
        </ul>
      </div>
    </section>

    <!-- Discount -->
    <section class="filter-group">
      <h3 class="filter-group__heading">
        <button
          type="button"
          class="filter-group__toggle"
          :aria-expanded="openSections.discount"
          aria-controls="filter-panel-discount"
          id="filter-discount-heading"
          @click="toggleSection('discount')"
        >
          <span class="filter-group__toggle-label">
            Discount
            <span v-if="selectedCount('discount')" class="filter-group__count">
              {{ selectedCount("discount") }}
            </span>
          </span>
          <ChevronDown
            class="filter-group__chevron"
            :class="{ 'filter-group__chevron--open': openSections.discount }"
            :size="18"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        v-show="openSections.discount"
        id="filter-panel-discount"
        class="filter-group__panel"
        role="region"
        aria-labelledby="filter-discount-heading"
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
      </div>
    </section>

    <button
      type="button"
      class="btn btn--tertiary filter-sidebar__clear"
      @click="emit('clear')"
    >
      Clear all filters
    </button>
  </aside>
</template>
