<script setup>
/**
 * ProductCard — shows ONE product and talks to parents with emit.
 *
 * Props (data in):
 *   product   — the item to display
 *   favorited — whether this product is in favorites
 *   quantity  — how many of this product are in the cart (0 = not in cart)
 *
 * Emits (events out):
 *   add-to-cart      — first add (quantity becomes 1)
 *   increase-cart    — bump quantity by 1
 *   decrease-cart    — lower quantity by 1 (parent removes at 0)
 *   toggle-favorite  — ask parent to add/remove this product from favorites
 *
 * Child components should not mutate shared lists directly — they ask the
 * parent to update by emitting.
 */
import { Minus, Plus, Heart } from "@lucide/vue";

defineProps({
  product: {
    type: Object,
    required: true,
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  quantity: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  "add-to-cart",
  "increase-cart",
  "decrease-cart",
  "toggle-favorite",
]);

function onAddToCart(product) {
  emit("add-to-cart", product);
}

function onIncrease(product) {
  emit("increase-cart", product);
}

function onDecrease(product) {
  emit("decrease-cart", product);
}

function onToggleFavorite(product) {
  emit("toggle-favorite", product);
}
</script>

<template>
  <article class="product-card">
    <div class="product-card__media">
      <img
        class="product-card__image"
        :src="product.image"
        :alt="product.name"
        width="300"
        height="280"
        loading="lazy"
      />
      <button
        type="button"
        class="product-card__favorite"
        :class="{ 'product-card__favorite--active': favorited }"
        :aria-label="favorited ? 'Remove from favorites' : 'Add to favorites'"
        :aria-pressed="favorited"
        @click="onToggleFavorite(product)"
      >
        <Heart :size="20" :fill="favorited ? 'currentColor' : 'none'" />
      </button>
    </div>

    <div class="product-card__body">
      <h3 class="product-card__title">{{ product.name }}</h3>
      <p class="product-card__desc">{{ product.description }}</p>

      <div class="product-card__footer">
        <p class="product-card__price">${{ product.price.toFixed(2) }}</p>

        <!-- Not in cart yet → Add to cart -->
        <button
          v-if="quantity === 0"
          type="button"
          class="btn btn--secondary product-card__cart"
          @click="onAddToCart(product)"
        >
          Add to cart
        </button>

        <!-- Already in cart → − qty + -->
        <div
          v-else
          class="product-card__qty"
          role="group"
          :aria-label="`Quantity for ${product.name}`"
        >
          <button
            type="button"
            class="product-card__qty-btn"
            :aria-label="`Decrease quantity of ${product.name}`"
            @click="onDecrease(product)"
          >
            <Minus :size="16" />
          </button>
          <span class="product-card__qty-value" aria-live="polite">
            {{ quantity }}
          </span>
          <button
            type="button"
            class="product-card__qty-btn"
            :aria-label="`Increase quantity of ${product.name}`"
            @click="onIncrease(product)"
          >
            <Plus :size="16" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
