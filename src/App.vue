<script setup>
/**
 * App.vue — root shell.
 *
 * Header + Footer live here so they stay mounted across routes.
 * RouterView swaps only the page body. ToastContainer stays here so any
 * page can call useToast().
 *
 * Vue concept: shared layout chrome in the root; page-specific UI in views.
 */
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import ToastContainer from "@/components/ToastContainer.vue";
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
  <Header
    :search-query="searchQuery"
    :categories="categories"
    :selected-categories="selectedCategories"
    @update:search-query="setQuery"
    @clear-search="clearSearch"
    @toggle-category="toggleCategory"
  />
  <RouterView />
  <Footer />
  <ToastContainer />
</template>
