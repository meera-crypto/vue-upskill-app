<script setup>
/**
 * Account page — guest placeholder for Profile / Your Account links.
 *
 * No auth yet (requirements: simulated shopping). This page gives the header
 * and footer a real destination and shortcuts to Favorites + Cart.
 *
 * Vue ideas: useRouter for navigation; Breadcrumbs for the trail; EmptyState
 * for the “not signed in” message + actions.
 */
import { computed } from "vue";
import { useRouter } from "vue-router";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import EmptyState from "@/components/listing/EmptyState.vue";

const router = useRouter();

const breadcrumbItems = computed(() => [{ label: "Account" }]);

function goToFavorites() {
  router.push({ name: "favorites" });
}

function goToCart() {
  router.push({ name: "cart" });
}

function continueShopping() {
  router.push({ name: "products" });
}
</script>

<template>
  <div class="account-page">
    <div class="container account-page__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <header class="account-page__header">
        <h1 class="account-page__title">Your account</h1>
      </header>

      <EmptyState
        message="You’re browsing as a guest. Sign-in isn’t available in this demo yet — use Favorites and Cart below, or keep shopping."
      >
        <template #actions>
          <button
            type="button"
            class="btn btn--secondary"
            @click="goToFavorites"
          >
            Favorites
          </button>
          <button type="button" class="btn btn--secondary" @click="goToCart">
            Cart
          </button>
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

<style>
@import "@/assets/styles/components/account-page.css";
</style>
