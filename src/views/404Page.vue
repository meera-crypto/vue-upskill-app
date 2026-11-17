<script setup>
/**
 * 404 page — shown for any URL that does not match a defined route.
 *
 * Vue concepts:
 * - Registered as a catch-all route (`/:pathMatch(.*)*`) so unknown paths land here
 * - useRouter() for the “Browse products” action (same pattern as cart / favorites)
 * - Reuses EmptyState so empty / error / not-found UI stay consistent
 */
import { useRouter } from "vue-router";
import EmptyState from "@/components/listing/EmptyState.vue";

const router = useRouter();

function continueShopping() {
  router.push({ name: "products" });
}
</script>

<template>
  <!-- Header / <main> are in App.vue — shared across routes. -->
  <div class="page-404">
    <div class="container page-404__inner">
      <header class="page-404__header">
        <p class="page-404__code" aria-hidden="true">404</p>
        <h1 class="page-404__title">Page not found</h1>
      </header>

      <EmptyState
        message="We couldn’t find that page. Check the address or head back to the product listing."
      >
        <template #actions>
          <button
            type="button"
            class="btn btn--primary"
            @click="continueShopping"
          >
            Browse products
          </button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
