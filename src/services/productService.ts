/**
 * productService — talks to DummyJSON and returns data ready for Vue.
 *
 * Mapping lives in `@/utils/productModel.ts`; search matching in
 * `@/utils/productSearch.ts`. This file keeps HTTP fetch helpers only.
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
} from "@/utils/productModel";
import {
  productMatchesSearch,
  matchingProductTag,
  matchingSearchMeta,
} from "@/utils/productSearch";
import type { Product, RawProduct } from "@/types/product";

export {
  PRODUCT_IMAGE_FALLBACK,
  hasValidDiscount,
  COLOR_SWATCH_HEX,
  formatCategoryLabel,
  productMatchesSearch,
  matchingProductTag,
  matchingSearchMeta,
};

const DEFAULT_API_BASE = "https://dummyjson.com";

const API_BASE = String(import.meta.env.VITE_BASE_URL || DEFAULT_API_BASE)
  .trim()
  .replace(/\/+$/, "");

if (!import.meta.env.VITE_BASE_URL && import.meta.env.DEV) {
  console.warn(
    "[productService] VITE_BASE_URL is missing — using DummyJSON default. Copy `.env.example` to `.env` and restart the dev server.",
  );
}

interface RequestOptions {
  signal?: AbortSignal;
}

interface ListParams extends RequestOptions {
  limit?: number;
  skip?: number;
}

interface SearchParams extends ListParams {
  q?: string;
}

interface ProductsPage {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

async function request(
  path: string,
  options: RequestOptions = {},
): Promise<RawProduct> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load products (${response.status}).`);
  }

  return response.json() as Promise<RawProduct>;
}

export async function fetchProducts({
  limit = 12,
  skip = 0,
  signal,
}: ListParams = {}): Promise<ProductsPage> {
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

export async function fetchCatalog({
  signal,
}: RequestOptions = {}): Promise<{ products: Product[]; total: number }> {
  const data = await request(`/products?limit=250`, { signal });
  const products = mapDummyProductsResponse(data);

  return {
    products,
    total: typeof data.total === "number" ? data.total : products.length,
  };
}

export async function searchProducts({
  q,
  limit = 12,
  skip = 0,
  signal,
}: SearchParams = {}): Promise<ProductsPage> {
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

export async function fetchProductById(
  id: number | string,
  { signal }: RequestOptions = {},
): Promise<Product> {
  const data = await request(`/products/${encodeURIComponent(id)}`, { signal });
  return mapDummyProduct(data);
}
