/**
 * Vue Router — maps URLs to pages.
 *
 * Home: `/` — all-products listing (Hero; design may change later).
 * Category pages: `/:category` — same listing view, scoped + CategoryBanner.
 * Other listing filters stay in the query (`?q=&brand=&page=`).
 * Product details (canonical): `/:category/:slug` e.g. `/gadgets/iphone-x`.
 * Legacy details: `/product/:slug` (rewrites to category path after load).
 * Legacy `/product?id=`, `/products/:id`, and `/category/:category` redirect.
 * `/favorites`, `/cart`, and `/account` are shopping / account pages.
 * Unknown paths hit the catch-all route and show 404Page.
 *
 * Lazy routes: home listing stays eager (first paint). Details, cart,
 * favorites, account, and 404 load on demand via dynamic `import()`.
 */
import { createRouter, createWebHistory } from "vue-router";
import type { LocationQuery } from "vue-router";
import ProductListingPage from "@/views/ProductListingPage.vue";
import {
  isLegacyCategorySlug,
  resolveStorefrontCategory,
} from "@/utils/categoryGroups";

const ProductDetailsPage = () => import("@/views/ProductDetailsPage.vue");
const FavoritesPage = () => import("@/views/FavoritesPage.vue");
const CartPage = () => import("@/views/CartPage.vue");
const AccountPage = () => import("@/views/AccountPage.vue");
const Page404 = () => import("@/views/404Page.vue");

/** Path segments reserved for app routes — not treated as category slugs. */
const RESERVED_CATEGORY_SLUGS = new Set([
  "product",
  "products",
  "favorites",
  "cart",
  "account",
  "category",
]);

/** Keep optional legacy variant query keys when hopping to the slug route. */
function legacyVariantQuery(query: LocationQuery): Record<string, string> {
  const next: Record<string, string> = {};
  for (const key of ["opts", "variant"]) {
    const raw = query[key];
    if (raw == null || raw === "") continue;
    next[key] = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw);
  }
  return next;
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "products",
      component: ProductListingPage,
    },
    {
      // Same listing; keeps ?query=… when someone uses the /products URL from the docs.
      // Legacy ?category= is rewritten to /:category by useListingQuerySync.
      path: "/products",
      redirect: (to) => {
        const raw = to.query.category;
        const category = resolveStorefrontCategory(
          Array.isArray(raw) ? raw[0] : raw,
        );
        if (category) {
          const query: LocationQuery = { ...to.query };
          delete query.category;
          return {
            name: "products-category",
            params: { category },
            query,
            hash: to.hash,
          };
        }
        return { name: "products", query: to.query, hash: to.hash };
      },
    },
    {
      // Legacy flat details path — page rewrites to `/:category/:slug` after load.
      path: "/product/:slug",
      name: "product-details-unscoped",
      component: ProductDetailsPage,
    },
    {
      // Legacy query URLs. Slug in query → unscoped path (then category rewrite).
      // Id-only links stay here briefly; ProductDetailsPage redirects after load.
      path: "/product",
      name: "product-details-legacy",
      component: ProductDetailsPage,
      beforeEnter(to) {
        const rawSlug = to.query.slug;
        const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
        if (typeof slug === "string" && slug.trim()) {
          return {
            name: "product-details-unscoped",
            params: { slug: slug.trim() },
            query: legacyVariantQuery(to.query),
            hash: to.hash,
          };
        }
        if (to.query.id == null || to.query.id === "") {
          return { name: "products" };
        }
        return true;
      },
    },
    {
      // Old path-param URLs → legacy hop (id) or unscoped slug path.
      path: "/products/:id",
      redirect: (to) => {
        const id = String(to.params.id ?? "");
        if (/^\d+$/.test(id)) {
          return {
            name: "product-details-legacy",
            query: { id, ...legacyVariantQuery(to.query) },
            hash: to.hash,
          };
        }
        if (id) {
          return {
            name: "product-details-unscoped",
            params: { slug: id },
            query: legacyVariantQuery(to.query),
            hash: to.hash,
          };
        }
        return { name: "products" };
      },
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
      path: "/account",
      name: "account",
      component: AccountPage,
    },
    {
      // Old /category/:category → /:category (canonical storefront slug)
      path: "/category/:category",
      redirect: (to) => {
        const category = resolveStorefrontCategory(to.params.category);
        if (!category) {
          return { name: "products", query: to.query, hash: to.hash };
        }
        return {
          name: "products-category",
          params: { category },
          query: to.query,
          hash: to.hash,
        };
      },
    },
    {
      // Product details — `/gadgets/iphone-x` (canonical shareable path).
      // Must sit before `/:category` listing; after reserved routes.
      path: "/:category/:slug",
      name: "product-details",
      component: ProductDetailsPage,
      beforeEnter(to) {
        const rawCategory = to.params.category;
        const categoryParam = Array.isArray(rawCategory)
          ? rawCategory[0]
          : rawCategory;
        const categorySlug =
          typeof categoryParam === "string"
            ? categoryParam.trim().toLowerCase()
            : "";
        if (!categorySlug || RESERVED_CATEGORY_SLUGS.has(categorySlug)) {
          return { name: "404-page" };
        }
        const rawSlug = to.params.slug;
        const productSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
        if (typeof productSlug !== "string" || !productSlug.trim()) {
          return { name: "404-page" };
        }
        // `/smartphones/foo` → `/gadgets/foo`
        if (isLegacyCategorySlug(categorySlug)) {
          return {
            name: "product-details",
            params: {
              category: resolveStorefrontCategory(categorySlug),
              slug: productSlug.trim(),
            },
            query: to.query,
            hash: to.hash,
          };
        }
        return true;
      },
    },
    {
      // Category listing — e.g. /gadgets?q=phone&page=2
      // Must sit after `/:category/:slug`; before the 404 catch-all.
      path: "/:category",
      name: "products-category",
      component: ProductListingPage,
      beforeEnter(to) {
        const raw = to.params.category;
        const category = Array.isArray(raw) ? raw[0] : raw;
        const slug =
          typeof category === "string" ? category.trim().toLowerCase() : "";
        if (!slug || RESERVED_CATEGORY_SLUGS.has(slug)) {
          return { name: "404-page" };
        }
        // /smartphones → /gadgets (and other DummyJSON → group redirects)
        if (isLegacyCategorySlug(slug)) {
          return {
            name: "products-category",
            params: { category: resolveStorefrontCategory(slug) },
            query: to.query,
            hash: to.hash,
          };
        }
        return true;
      },
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
    // Same details route family, different product slug / category.
    if (
      (to.name === "product-details" ||
        to.name === "product-details-unscoped") &&
      (to.params.slug !== from.params.slug ||
        to.params.category !== from.params.category)
    ) {
      return { top: 0 };
    }
    if (
      to.name === "products-category" &&
      to.params.category !== from.params.category
    ) {
      return { top: 0 };
    }
    return false;
  },
});

export default router;
