/**
 * Helpers for product options / variants.
 *
 * Works on the mapped product shape — whether variants came from the API
 * or the local DummyJSON overlay. Keep matching logic here so components
 * only deal with reactive selectedOptions + computed activeVariant.
 */

import type { Product, ProductOption, ProductVariant } from "@/types/product";

/** Minimal product fields these helpers read. */
type ProductLike = Pick<Product, "id" | "options" | "variants"> & {
  variantId?: string | number | null;
};

export function productHasVariants(
  product: ProductLike | null | undefined,
): boolean {
  return Array.isArray(product?.variants) && product.variants.length > 0;
}

export function productOptions(
  product: ProductLike | null | undefined,
): ProductOption[] {
  return Array.isArray(product?.options) ? product.options : [];
}

/** True when every option group has a selected value. */
export function isVariantSelectionComplete(
  product: ProductLike | null | undefined,
  selected: Record<string, string>,
): boolean {
  const options = productOptions(product);
  if (options.length === 0) return true;
  return options.every((option) => {
    const value = selected?.[option.name];
    return typeof value === "string" && value.length > 0;
  });
}

/** Find the variant matching the selected option map. */
export function findVariantByOptions(
  product: ProductLike | null | undefined,
  selected: Record<string, string>,
): ProductVariant | null {
  if (!productHasVariants(product) || !product) return null;
  if (!isVariantSelectionComplete(product, selected)) return null;

  return (
    product.variants.find((variant) => {
      const opts = variant?.options;
      if (!opts || typeof opts !== "object") return false;
      return Object.entries(selected).every(
        ([name, value]) => opts[name] === value,
      );
    }) ?? null
  );
}

/**
 * Variant to use when adding from listing cards (no UI selection yet):
 * prefer an explicit variant, else the first in-stock variant.
 */
export function resolveVariantForAdd(
  product: ProductLike | null | undefined,
  variant: ProductVariant | null = null,
): ProductVariant | null {
  if (!productHasVariants(product) || !product) return null;

  if (variant?.id != null) {
    const match = product.variants.find(
      (entry) => String(entry.id) === String(variant.id),
    );
    return match ?? null;
  }

  return product.variants.find((entry) => Number(entry.stock) > 0) ?? null;
}

/** Cart line identity: variant id when present, otherwise product id. */
export function cartLineKey(
  product: ProductLike | null | undefined,
  variant: ProductVariant | null = null,
): string {
  if (variant?.id != null) return String(variant.id);
  if (product?.variantId != null) return String(product.variantId);
  return String(product?.id ?? "");
}

/** Human-readable selected options, e.g. "Blue / M". */
export function formatSelectedOptions(
  options: Record<string, string> | null | undefined,
): string {
  if (!options || typeof options !== "object") return "";
  return Object.values(options)
    .filter((value) => typeof value === "string" && value.trim())
    .join(" / ");
}

/**
 * Whether a specific option value still has any purchasable variant,
 * given the other currently selected options.
 */
export function isOptionValueAvailable(
  product: ProductLike | null | undefined,
  optionName: string,
  optionValue: string,
  selected: Record<string, string>,
): boolean {
  if (!productHasVariants(product) || !product) return true;

  return product.variants.some((variant) => {
    const opts = variant?.options;
    if (!opts || typeof opts !== "object") return false;
    if (opts[optionName] !== optionValue) return false;
    if ((Number(variant.stock) || 0) <= 0) return false;

    return Object.entries(selected).every(([name, value]) => {
      if (name === optionName) return true;
      if (!value) return true;
      return opts[name] === value;
    });
  });
}
