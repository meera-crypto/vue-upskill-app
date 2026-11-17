<script setup>
/**
 * QuickViewModal — card hover options strip (color/size), not a dialog.
 *
 * Named to match the architecture checklist. On desktop/hover, options appear
 * over the product image so shoppers can pick a variant before Add to cart.
 *
 * Vue ideas: parent owns `selectedOptions` + availability helpers; this child
 * emits `select` when an option value is clicked.
 */
defineProps({
  optionGroups: {
    type: Array,
    required: true,
  },
  selectedOptions: {
    type: Object,
    required: true,
  },
  /** (optionName, optionValue) => hex string or "" */
  swatchHexFor: {
    type: Function,
    required: true,
  },
  /** (optionName, optionValue) => boolean */
  isAvailable: {
    type: Function,
    required: true,
  },
});

defineEmits(["select"]);
</script>

<template>
  <div class="product-card__quick-variants" aria-label="Available options">
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
              !!swatchHexFor(group.name, value),
            'product-card__quick-option--selected':
              selectedOptions[group.name] === value,
            'product-card__quick-option--unavailable':
              !isAvailable(group.name, value),
          }"
          :style="
            swatchHexFor(group.name, value)
              ? { '--swatch': swatchHexFor(group.name, value) }
              : undefined
          "
          role="listitem"
          :aria-pressed="selectedOptions[group.name] === value"
          :aria-label="`${group.name} ${value}`"
          :title="
            isAvailable(group.name, value) ? value : `${value} unavailable`
          "
          @click.stop="$emit('select', group.name, value)"
        >
          <span
            v-if="swatchHexFor(group.name, value)"
            class="product-card__quick-swatch"
            aria-hidden="true"
          />
          <span v-else>{{ value }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
