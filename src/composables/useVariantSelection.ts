/**
 * useVariantSelection — shared option / SKU state for PDP + Quick View.
 *
 * Vue idea: both surfaces need the same derived state (activeVariant,
 * canPurchase, swatches). Keep that logic here so the dialog and details
 * page stay in sync without copy-paste.
 *
 * `productSource` can be a ref, a computed, or a getter function.
 */
import { computed, ref, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import type { Product } from "@/types/product";
import { COLOR_SWATCH_HEX } from "@/utils/productModel";
import {
  cartLineKey,
  findVariantByOptions,
  isOptionValueAvailable,
  isVariantSelectionComplete,
  productHasVariants,
  productOptions,
} from "@/utils/variants";

type ProductOrNull = Product | null | undefined;

/** A ref / computed / plain product, or a getter that returns one. */
export type VariantProductSource = MaybeRefOrGetter<Product | null>;

export interface VariantSelectionOptions {
  initialOptions?: Record<string, string>;
}

/** Result of `ensureVariantReady()`. */
export type VariantReadiness =
  | { ok: true }
  | { ok: false; message: string };

export function useVariantSelection(
  productSource: VariantProductSource,
  options: VariantSelectionOptions = {},
) {
  const selectedOptions = ref<Record<string, string>>({
    ...(options.initialOptions || {}),
  });

  // toValue() unwraps a ref/computed or calls a getter — same as before.
  const product = computed<ProductOrNull>(() => toValue(productSource));

  const hasVariants = computed(() => productHasVariants(product.value));
  const optionGroups = computed(() => productOptions(product.value));

  const selectionComplete = computed(() =>
    isVariantSelectionComplete(product.value, selectedOptions.value),
  );

  const activeVariant = computed(() =>
    findVariantByOptions(product.value, selectedOptions.value),
  );

  const lineKey = computed(() =>
    product.value ? cartLineKey(product.value, activeVariant.value) : "",
  );

  const productHasStock = computed(() => (product.value?.stock ?? 0) > 0);

  const canPurchase = computed(() => {
    if (!productHasStock.value) return false;
    if (!hasVariants.value) return true;
    if (!selectionComplete.value) return false;
    return (activeVariant.value?.stock ?? 0) > 0;
  });

  /**
   * Show “Notify me” when the product (or selected combination) is OOS.
   * Incomplete variant picks still show Buy now (disabled).
   */
  const showNotifyMe = computed(() => {
    if (!product.value) return false;
    if (!productHasStock.value) return true;
    if (!hasVariants.value || !selectionComplete.value) return false;
    return (activeVariant.value?.stock ?? 0) <= 0;
  });

  const inStock = computed(() => {
    if (!hasVariants.value) return productHasStock.value;
    if (!selectionComplete.value) return productHasStock.value;
    return (activeVariant.value?.stock ?? 0) > 0;
  });

  const maxQuantity = computed(() => {
    const stock = hasVariants.value
      ? Number(activeVariant.value?.stock)
      : Number(product.value?.stock);
    return Number.isFinite(stock) && stock > 0 ? stock : 1;
  });

  const displayPrice = computed(() => {
    if (
      activeVariant.value &&
      Number.isFinite(Number(activeVariant.value.price))
    ) {
      return Number(activeVariant.value.price);
    }
    return Number(product.value?.price) || 0;
  });

  const missingOptionNames = computed(() => {
    if (!hasVariants.value) return [];
    return optionGroups.value
      .filter((option) => !selectedOptions.value[option.name])
      .map((option) => option.name);
  });

  const selectionHint = computed(() => {
    if (!hasVariants.value) return "";
    if (missingOptionNames.value.length > 0) {
      return `Select ${missingOptionNames.value.join(" and ")}`;
    }
    if (selectionComplete.value && !activeVariant.value) {
      return "This combination is unavailable";
    }
    if (selectionComplete.value && (activeVariant.value?.stock ?? 0) <= 0) {
      return "This combination is out of stock";
    }
    return "";
  });

  /** Low-stock cue — uses selected SKU stock when resolved, else parent stock. */
  const fewLeft = computed(() => {
    if (!productHasStock.value) return false;
    const stock =
      hasVariants.value && activeVariant.value
        ? Number(activeVariant.value.stock)
        : Number(product.value?.stock);
    return Number.isFinite(stock) && stock > 0 && stock < 30;
  });

  function setOptions(next: Record<string, string> | null | undefined) {
    selectedOptions.value = { ...(next || {}) };
  }

  function resetOptions() {
    selectedOptions.value = {};
  }

  function selectOption(optionName: string, optionValue: string) {
    selectedOptions.value = {
      ...selectedOptions.value,
      [optionName]: optionValue,
    };
  }

  function optionValueAvailable(optionName: string, optionValue: string) {
    return isOptionValueAvailable(
      product.value,
      optionName,
      optionValue,
      selectedOptions.value,
    );
  }

  /**
   * Color options get swatches when we know a hex; everything else is a chip.
   */
  function optionSwatchHex(optionName: string, optionValue: string): string {
    if (String(optionName).toLowerCase() !== "color") return "";
    const key = String(optionValue).trim().toLowerCase();
    return COLOR_SWATCH_HEX[key] || "";
  }

  /**
   * Validate selection before cart actions. Returns false + optional hint.
   */
  function ensureVariantReady(): VariantReadiness {
    if (!product.value) return { ok: false, message: "Product unavailable" };
    if (!hasVariants.value) return { ok: true };
    if (!selectionComplete.value) {
      return {
        ok: false,
        message: selectionHint.value || "Select product options",
      };
    }
    if (!activeVariant.value || (activeVariant.value.stock ?? 0) <= 0) {
      return {
        ok: false,
        message: selectionHint.value || "This combination is unavailable",
      };
    }
    return { ok: true };
  }

  return {
    selectedOptions,
    hasVariants,
    optionGroups,
    selectionComplete,
    activeVariant,
    lineKey,
    productHasStock,
    canPurchase,
    showNotifyMe,
    inStock,
    maxQuantity,
    displayPrice,
    missingOptionNames,
    selectionHint,
    fewLeft,
    setOptions,
    resetOptions,
    selectOption,
    optionValueAvailable,
    optionSwatchHex,
    ensureVariantReady,
  };
}
