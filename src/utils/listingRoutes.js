/**
 * Listing route helpers — category lives in the path; other filters stay in the query.
 *
 *   /                     → all products
 *   /gadgets              → category slug only in the path
 *   /gadgets?q=phone      → category + search/filters
 *
 * Legacy `?category=` and `/category/:category` rewrite to `/:category`.
 * Fine-grained DummyJSON slugs (e.g. smartphones) canonicalize to groups.
 */
import { resolveStorefrontCategory } from "@/utils/categoryGroups.js";

/**
 * @param {{
 *   category?: string | null,
 *   query?: Record<string, string>,
 * }} [options]
 * @returns {{ name: string, params?: { category: string }, query: Record<string, string> }}
 */
export function listingTo(options = {}) {
  const category = resolveStorefrontCategory(options.category);

  /** @type {Record<string, string>} */
  const query = { ...(options.query ?? {}) };
  delete query.category;

  if (category) {
    return {
      name: "products-category",
      params: { category },
      query,
    };
  }

  return {
    name: "products",
    query,
  };
}

/**
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @returns {string}
 */
export function categoryFromRoute(route) {
  if (route.name === "products-category") {
    const raw = route.params.category;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return resolveStorefrontCategory(value);
  }

  // Legacy query support while rewriting.
  const raw = route.query?.category;
  if (raw == null || raw === "") return "";
  const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw);
  return resolveStorefrontCategory(value);
}

/**
 * True when both locations are listing routes (with or without category).
 * @param {unknown} name
 */
export function isListingRouteName(name) {
  return name === "products" || name === "products-category";
}
