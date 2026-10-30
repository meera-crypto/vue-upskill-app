/**
 * Vue Router — maps URLs to pages.
 *
 * Query params on the listing route hold shareable search/filter/page state
 * (see useListingQuerySync). Path can be `/` or `/products`.
 */
import { createRouter, createWebHistory } from "vue-router";
import ProductListingPage from "@/views/ProductListingPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "products",
      component: ProductListingPage,
    },
    {
      // Same page; keeps ?query=… when someone uses the /products URL from the docs.
      path: "/products",
      redirect: (to) => ({ name: "products", query: to.query, hash: to.hash }),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.path !== from.path) return { top: 0 };
    return false;
  },
});

export default router;
