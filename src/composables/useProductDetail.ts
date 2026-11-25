/**
 * useProductDetail — load one product from the URL slug
 * (`/:category/:slug` or legacy `/product/:slug`).
 *
 * Vue ideas:
 * - `watch` on the slug so Product A → Product B refetches
 * - Resolve slug → id via the shared catalog (ensure catalog is loaded)
 * - AbortController so a slow response for A cannot overwrite B
 * - Optional catalog hit for a faster first paint while the network fetch runs
 * - Legacy `?id=` still works until the page redirects to the category path
 */
import { ref, watch, onUnmounted, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import type { Product } from "@/types/product";
import { fetchProductById } from "@/services/productService";
import { useProducts } from "@/composables/useProducts";

/** Route param / query value: single string, repeated values, or missing. */
type RouteValue = string | (string | null)[] | undefined | null;

export interface ProductDetailOptions {
  legacyIdSource?: MaybeRefOrGetter<RouteValue>;
}

export function useProductDetail(
  slugSource: MaybeRefOrGetter<RouteValue>,
  options: ProductDetailOptions = {},
) {
  const { legacyIdSource } = options;
  const { catalog, load: loadCatalog } = useProducts({ immediate: false });

  const product = ref<Product | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notFound = ref(false);

  let controller: AbortController | null = null;

  function normalizeSlug(raw: RouteValue): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null || value === "") return "";
    return String(value).trim();
  }

  function resolveId(raw: RouteValue): string | number | null {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null || value === "") return null;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : String(value);
  }

  /**
   * Slug helper used when we only had an id: `/product/id-101`.
   */
  function idFromSlugAlias(slug: string): string | number | null {
    const match = /^id-(\d+)$/i.exec(slug);
    if (!match) return null;
    return Number(match[1]);
  }

  async function fetchById(id: string | number, signal: AbortSignal) {
    const cached = catalog.value.find((item) => String(item.id) === String(id));
    if (cached) {
      product.value = cached;
      notFound.value = false;
      error.value = null;
    } else {
      product.value = null;
    }

    loading.value = !cached;
    error.value = null;
    notFound.value = false;

    try {
      const next = await fetchProductById(id, { signal });
      product.value = next as Product;
      loading.value = false;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      loading.value = false;
      if (!cached) {
        product.value = null;
      }

      const statusMatch =
        err instanceof Error ? err.message.match(/\((\d+)\)/) : null;
      const status = statusMatch ? Number(statusMatch[1]) : null;

      if (status === 404) {
        notFound.value = true;
        error.value = "This product could not be found.";
        product.value = null;
        return;
      }

      error.value =
        err instanceof Error
          ? err.message
          : "Something went wrong loading this product.";
    }
  }

  async function load() {
    const slug = normalizeSlug(toValue(slugSource));
    const legacyId = legacyIdSource ? resolveId(toValue(legacyIdSource)) : null;

    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    const { signal } = activeController;

    if (!slug && legacyId == null) {
      product.value = null;
      loading.value = false;
      error.value = "Missing product.";
      notFound.value = true;
      return;
    }

    loading.value = true;
    error.value = null;
    notFound.value = false;

    try {
      if (slug) {
        const aliasId = idFromSlugAlias(slug);
        if (aliasId != null) {
          await fetchById(aliasId, signal);
          return;
        }

        await loadCatalog();
        if (signal.aborted) return;

        const cached = catalog.value.find(
          (item) => String(item.slug) === slug,
        );
        if (!cached?.id) {
          product.value = null;
          loading.value = false;
          notFound.value = true;
          error.value = "This product could not be found.";
          return;
        }

        await fetchById(cached.id, signal);
        return;
      }

      // Legacy `/product?id=` (before redirect to `/product/:slug`).
      await fetchById(legacyId as string | number, signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      loading.value = false;
      product.value = null;
      error.value =
        err instanceof Error
          ? err.message
          : "Something went wrong loading this product.";
    }
  }

  function retry() {
    return load();
  }

  watch(
    () => {
      const slug = normalizeSlug(toValue(slugSource));
      const legacyId = legacyIdSource
        ? resolveId(toValue(legacyIdSource))
        : null;
      // Re-run when catalog first fills so a cold slug lookup can resolve.
      return `${slug}|${legacyId ?? ""}|${catalog.value.length}`;
    },
    () => {
      load();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    controller?.abort();
  });

  return {
    product,
    loading,
    error,
    notFound,
    retry,
  };
}
