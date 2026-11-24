/**
 * productService — talks to DummyJSON and returns data ready for Vue.
 *
 * Mapping lives in `@/utils/productModel.js`; search matching in
 * `@/utils/productSearch.js`. This file keeps HTTP fetch helpers only.
 *
 * Docs: https://dummyjson.com/docs/products
 */

import {
  mapDummyProduct,
  mapDummyProductsResponse,
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
  COLOR_SWATCH_HEX,
  formatCategoryLabel,
} from "@/utils/productModel.js";
import {
  productMatchesSearch,
  matchingProductTag,
  matchingSearchMeta,
} from "@/utils/productSearch.js";

/* Re-export pure helpers so older imports from productService keep working
 * (e.g. ProductDetailsPage / ProductQuickViewDialog owned by another agent).
 * Prefer importing from productModel / productSearch in new code. */
export {
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
  COLOR_SWATCH_HEX,
  formatCategoryLabel,
  productMatchesSearch,
  matchingProductTag,
  matchingSearchMeta,
};

/**
 * API origin from `.env` (`VITE_BASE_URL`). Vite only exposes vars prefixed
 * with `VITE_` to client code via `import.meta.env` (inlined at dev/build time).
 * Trailing slashes are stripped so paths like `/products` stay valid.
 *
 * Fallback keeps DummyJSON working if `.env` was missing at server start/build;
 * prefer setting `VITE_BASE_URL` and restarting `npm run dev` / rebuilding.
 */
const DEFAULT_API_BASE = "https://dummyjson.com";

const API_BASE = String(import.meta.env.VITE_BASE_URL || DEFAULT_API_BASE)
  .trim()
  .replace(/\/+$/, "");

if (!import.meta.env.VITE_BASE_URL && import.meta.env.DEV) {
  console.warn(
    "[productService] VITE_BASE_URL is missing — using DummyJSON default. Copy `.env.example` to `.env` and restart the dev server.",
  );
}

/**
 * @param {string} path
 * @param {{ signal?: AbortSignal }} [options]
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load products (${response.status}).`);
  }

  return response.json();
}

/**
 * List products with DummyJSON pagination.
 * @param {{ limit?: number, skip?: number, signal?: AbortSignal }} [params]
 */
export async function fetchProducts({ limit = 12, skip = 0, signal } = {}) {
  const data = await request(
    `/products?limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}`,
    { signal },
  );

  return {
    products: mapDummyProductsResponse(data),
    total: typeof data.total === "number" ? data.total : 0,
    skip: typeof data.skip === "number" ? data.skip : skip,
    limit: typeof data.limit === "number" ? data.limit : limit,
  };
}

/**
 * Load the full DummyJSON catalog (~194 items) for client-side search/filters.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchCatalog({ signal } = {}) {
  const data = await request(`/products?limit=250`, { signal });
  const products = mapDummyProductsResponse(data);

  return {
    products,
    total: typeof data.total === "number" ? data.total : products.length,
  };
}

/**
 * Case-insensitive partial match on product title, brand, or tags.
 * Prefer filtering an already-loaded catalog in the composable; this helper
 * remains for one-off searches that still need a network fetch.
 * @param {{ q: string, limit?: number, skip?: number, signal?: AbortSignal }} params
 */
export async function searchProducts({ q, limit = 12, skip = 0, signal } = {}) {
  const query = String(q ?? "")
    .trim()
    .toLowerCase();

  if (!query) {
    return fetchProducts({ limit, skip, signal });
  }

  const { products: catalog } = await fetchCatalog({ signal });
  const matched = catalog.filter((product) =>
    productMatchesSearch(product, query),
  );

  return {
    products: matched.slice(skip, skip + limit),
    total: matched.length,
    skip,
    limit,
  };
}

/**
 * Fetch a single product by id.
 * @param {number|string} id
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchProductById(id, { signal } = {}) {
  const data = await request(`/products/${encodeURIComponent(id)}`, { signal });
  return mapDummyProduct(data);
}
