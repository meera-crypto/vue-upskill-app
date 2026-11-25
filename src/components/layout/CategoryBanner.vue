<script setup lang="ts">
/**
 * CategoryBanner — hero strip for a category page (`/:category`).
 *
 * Breadcrumbs (Home → category) live inside this banner.
 * Intro copy is tablet+; crumbs stay visible on mobile so shoppers can
 * still get back to Home.
 *
 * Vue ideas:
 * - `category` prop = storefront slug from the route
 * - `computed` picks banner copy and crumbs
 * - Home keeps the separate `Hero.vue`; this component is category pages only
 */
import { computed } from "vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import { getCategoryBanner } from "@/utils/categoryGroups";

const props = defineProps({
  /** Storefront category slug (e.g. beauty, gadgets). */
  category: {
    type: String,
    required: true,
  },
});

const banner = computed(() => getCategoryBanner(props.category));

const breadcrumbItems = computed(() => {
  if (!banner.value) return [];
  return [
    { label: "Home", to: { name: "products" } },
    { label: banner.value.label },
  ];
});
</script>

<template>
  <section
    v-if="banner"
    class="category-banner"
    :aria-labelledby="`category-banner-${banner.slug}`"
  >
    <div class="container category-banner__inner">
      <Breadcrumbs :items="breadcrumbItems" />

      <div class="category-banner__intro">
        <h1
          :id="`category-banner-${banner.slug}`"
          class="category-banner__title"
        >
          {{ banner.label }}
        </h1>
        <div class="category-banner__details">
          <p class="category-banner__description">{{ banner.description }}</p>
          <ul
            v-if="banner.tags.length"
            class="category-banner__tags"
            aria-label="Category highlights"
          >
            <li
              v-for="tag in banner.tags"
              :key="tag"
              class="category-banner__tag"
            >
              {{ tag }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
