/**
 * useProductDetail — load one product by id from the URL query (`?id=`).
 *
 * Vue ideas:
 * - `watch` on the id so navigating Product A → Product B refetches
 * - AbortController so a slow response for A cannot overwrite B
 * - Optional catalog hit for a faster first paint while the network fetch runs
 */
import { ref, watch, onUnmounted } from "vue";
import { fetchProductById } from "@/services/productService.js";
import { useProducts } from "@/composables/useProducts.js";

/**
 * @param {import('vue').Ref<string | string[] | undefined> | import('vue').ComputedRef<string | string[] | undefined>} productIdSource
 */
export function useProductDetail(productIdSource) {
  const { catalog } = useProducts({ immediate: false });

  const product = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const notFound = ref(false);

  /** @type {AbortController | null} */
  let controller = null;

  function resolveId(raw) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null || value === "") return null;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : String(value);
  }

  /**
   * @param {string | string[] | undefined} rawId
   */
  async function load(rawId) {
    const id = resolveId(rawId);
    controller?.abort();

    if (id == null) {
      product.value = null;
      loading.value = false;
      error.value = "Missing product id.";
      notFound.value = true;
      return;
    }

    const cached = catalog.value.find((item) => String(item.id) === String(id));
    if (cached) {
      product.value = cached;
      notFound.value = false;
      error.value = null;
    } else {
      product.value = null;
    }

    controller = new AbortController();
    loading.value = !cached;
    error.value = null;
    notFound.value = false;

    try {
      const next = await fetchProductById(id, { signal: controller.signal });
      product.value = next;
      loading.value = false;
    } catch (err) {
      if (err?.name === "AbortError") return;

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

  function retry() {
    return load(productIdSource.value);
  }

  watch(
    productIdSource,
    (id) => {
      load(id);
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
