<script setup>
/**
 * Cart page — shows every line in the shared useCart() bag.
 *
 * Vue concepts:
 * - useCart() reads the same module-scoped state as the listing page
 * - useRouter() navigates “Continue shopping” back to products
 * - Quantity +/- updates reactive state; computed subtotal recalculates
 * - Variant lines use `line.key` (variant id), not only product.id
 */
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Minus, Plus, Trash2 } from "@lucide/vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import { useCart } from "@/composables/useCart.js";
import { useToast } from "@/composables/useToast.js";
import { PRODUCT_IMAGE_FALLBACK } from "@/services/productService.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import { formatSelectedOptions } from "@/utils/variants.js";

const router = useRouter();
const toast = useToast();
const {
  cartLines,
  cartCount,
  cartSubtotal,
  increment,
  decrement,
  removeFromCart,
  clearCart,
} = useCart();

/** Products → Cart (current page has no link). */
const breadcrumbItems = computed(() => [
  { label: "Products", to: { name: "products" } },
  { label: "Cart" },
]);

function productLabel(product) {
  return product?.title?.trim() || "Item";
}

function lineOptionsLabel(product) {
  return formatSelectedOptions(product?.selectedOptions);
}

function onRemove(line) {
  removeFromCart(line.key);
  toast.info(`${productLabel(line.product)} removed from cart`);
}

function onClear() {
  clearCart();
  toast.info("Cart cleared");
}

function onImageError(event) {
  if (event.target.src !== PRODUCT_IMAGE_FALLBACK) {
    event.target.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function continueShopping() {
  router.push({ name: "products" });
}

function lineMax(product) {
  const stock = Number(product.stock);
  return Number.isFinite(stock) && stock > 0 ? stock : 1;
}
</script>

<template>
  <!-- Header is in App.vue — shared across routes. -->
  <main class="cart-page">
    <div class="container cart-page__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <header class="cart-page__header">
        <h1 class="cart-page__title">Your cart</h1>
        <p v-if="cartCount > 0" class="cart-page__count">
          {{ cartCount }} {{ cartCount === 1 ? "item" : "items" }}
        </p>
      </header>

      <div v-if="cartLines.length === 0" class="cart-page__empty">
        <p class="cart-page__empty-text">Your cart is empty.</p>
        <button
          type="button"
          class="btn btn--secondary"
          @click="continueShopping"
        >
          Continue shopping
        </button>
      </div>

      <template v-else>
        <ul class="cart-page__list" aria-label="Cart items">
          <li
            v-for="line in cartLines"
            :key="line.key"
            class="cart-line"
          >
            <div class="cart-line__media">
              <img
                class="cart-line__image"
                :src="line.product.image || PRODUCT_IMAGE_FALLBACK"
                :alt="productLabel(line.product)"
                width="96"
                height="96"
                loading="lazy"
                @error="onImageError"
              />
            </div>

            <div class="cart-line__body">
              <div class="cart-line__info">
                <p
                  v-if="line.product.brand || line.product.categoryLabel"
                  class="cart-line__brand"
                >
                  {{ line.product.brand || line.product.categoryLabel }}
                </p>
                <h2 class="cart-line__title">
                  <RouterLink
                    class="cart-line__title-link"
                    :to="
                      productDetailsTo(line.product, {
                        selectedOptions: line.product.selectedOptions,
                      })
                    "
                  >
                    {{ productLabel(line.product) }}
                  </RouterLink>
                </h2>
                <p
                  v-if="lineOptionsLabel(line.product)"
                  class="cart-line__variant"
                >
                  {{ lineOptionsLabel(line.product) }}
                </p>
                <p class="cart-line__price">
                  ${{ Number(line.product.price).toFixed(2) }}
                </p>
              </div>

              <div class="cart-line__controls">
                <div
                  class="cart-line__qty"
                  role="group"
                  :aria-label="`Quantity for ${productLabel(line.product)}`"
                >
                  <button
                    type="button"
                    class="cart-line__qty-btn"
                    aria-label="Decrease quantity"
                    :disabled="line.quantity <= 0"
                    @click="decrement(line.key)"
                  >
                    <Minus :size="16" aria-hidden="true" />
                  </button>
                  <span class="cart-line__qty-value" aria-live="polite">
                    {{ line.quantity }}
                  </span>
                  <button
                    type="button"
                    class="cart-line__qty-btn"
                    aria-label="Increase quantity"
                    :disabled="line.quantity >= lineMax(line.product)"
                    @click="increment(line.key)"
                  >
                    <Plus :size="16" aria-hidden="true" />
                  </button>
                </div>

                <p class="cart-line__line-total">
                  ${{ (Number(line.product.price) * line.quantity).toFixed(2) }}
                </p>

                <button
                  type="button"
                  class="cart-line__remove"
                  :aria-label="`Remove ${productLabel(line.product)}`"
                  @click="onRemove(line)"
                >
                  <Trash2 :size="18" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <aside class="cart-page__summary" aria-label="Order summary">
          <div class="cart-page__summary-row">
            <span>Subtotal</span>
            <strong>${{ cartSubtotal.toFixed(2) }}</strong>
          </div>
          <p class="cart-page__summary-note">
            Taxes and shipping are calculated at checkout (demo store).
          </p>
          <button
            type="button"
            class="btn btn--primary cart-page__checkout"
            disabled
          >
            Checkout (coming soon)
          </button>
          <div class="cart-page__summary-actions">
            <button
              type="button"
              class="btn btn--secondary"
              @click="continueShopping"
            >
              Continue shopping
            </button>
            <button type="button" class="btn btn--tertiary" @click="onClear">
              Clear cart
            </button>
          </div>
        </aside>
      </template>
    </div>
  </main>
</template>
