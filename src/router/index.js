/**
 * Vue Router — maps URLs to pages.
 *
 * Query params on the listing route hold shareable search/filter/page state
 * (see useListingQuerySync). Path can be `/` or `/products`.
 * Product details uses `/product?id=…&slug=…` (id required; slug for readability).
 * `/favorites` and `/cart` are shopping pages fed by shared composables.
 * Unknown paths hit the catch-all route and show 404Page.
 */
import { createRouter, createWebHistory } from "vue-router";
import ProductListingPage from "@/views/ProductListingPage.vue";
import ProductDetailsPage from "@/views/ProductDetailsPage.vue";
import FavoritesPage from "@/views/FavoritesPage.vue";
import CartPage from "@/views/CartPage.vue";
import Page404 from "@/views/404Page.vue";

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
    {
      path: "/product",
      name: "product-details",
      component: ProductDetailsPage,
    },
    {
      // Old path-param URLs → query-param form.
      path: "/products/:id",
      redirect: (to) => ({
        name: "product-details",
        query: { id: String(to.params.id) },
      }),
    },
    {
      path: "/favorites",
      name: "favorites",
      component: FavoritesPage,
    },
    {
      path: "/cart",
      name: "cart",
      component: CartPage,
    },
    {
      // Must stay last: matches any path that did not match a route above.
      path: "/:pathMatch(.*)*",
      name: "404-page",
      component: Page404,
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.path !== from.path) return { top: 0 };
    // Same path, different product id in the query (e.g. /product?id=1 → ?id=2).
    if (to.name === "product-details" && to.query.id !== from.query.id) {
      return { top: 0 };
    }
    return false;
  },
});

export default router;
