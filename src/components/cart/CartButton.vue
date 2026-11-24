<script setup>
/**
 * CartButton — header/nav link to the cart with a live count badge.
 *
 * Vue idea: this component calls `useCart()` itself so parents do not need
 * to pass the count. Same shared module-scope cart as the rest of the app.
 */
import { ShoppingCart } from "@lucide/vue";
import { useCart } from "@/composables/useCart.js";

const { cartCount } = useCart();
</script>

<template>
  <RouterLink :to="{ name: 'cart' }" class="nav-icon" aria-label="Cart">
    <ShoppingCart :size="24" />
    <span class="nav-label">Cart</span>
    <span v-if="cartCount > 0" class="nav-badge" aria-hidden="true">
      {{ cartCount }}
    </span>
  </RouterLink>
</template>
