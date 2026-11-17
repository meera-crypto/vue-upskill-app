<script setup>
/**
 * App.vue — root shell.
 *
 * Header, main landmark, and Footer live here so they stay mounted across
 * routes. RouterView swaps only the page body inside <main>. ToastContainer
 * stays here so any page can call useToast().
 *
 * Vue concept: shared layout chrome in the root; page-specific UI in views.
 */
import AppHeader from "@/components/layout/AppHeader.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import ToastContainer from "@/components/layout/ToastContainer.vue";
import { useAppHeader } from "@/composables/useAppHeader.js";

const {
  searchQuery,
  setQuery,
  clearSearch,
  categories,
  selectedCategories,
  toggleCategory,
} = useAppHeader();
</script>

<template>
  <!--
    Skip link: first in the tab order. Hidden until focused so keyboard users
    can jump past header/nav into the shared <main> on any route.
  -->
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <AppHeader
    :search-query="searchQuery"
    :categories="categories"
    :selected-categories="selectedCategories"
    @update:search-query="setQuery"
    @clear-search="clearSearch"
    @toggle-category="toggleCategory"
  />
  <main id="main-content" tabindex="-1">
    <RouterView />
  </main>
  <AppFooter />
  <ToastContainer />
</template>
