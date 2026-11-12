/**
 * Helpers for product options / variants.
 *
 * Works on the mapped product shape from `productService` — whether variants
 * came from the API or the local DummyJSON overlay. Keep matching logic here
 * (plain JS) so components only deal with reactive selectedOptions + computed
 * activeVariant.
 */

/**
 * @param {Record<string, unknown> | null | undefined} product
 * @returns {boolean}
 */
export function productHasVariants(product) {
  return Array.isArray(product?.variants) && product.variants.length > 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} product
 * @returns {{ name: string, values: string[] }[]}
 */
export function productOptions(product) {
  return Array.isArray(product?.options) ? product.options : [];
}

/**
 * True when every option group has a selected value.
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, string>} selected
 */
export function isVariantSelectionComplete(product, selected) {
  const options = productOptions(product);
  if (options.length === 0) return true;
  return options.every((option) => {
    const value = selected?.[option.name];
    return typeof value === "string" && value.length > 0;
  });
}

/**
 * Find the variant matching the selected option map.
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, string>} selected
 * @returns {Record<string, unknown> | null}
 */
export function findVariantByOptions(product, selected) {
  if (!productHasVariants(product)) return null;
  if (!isVariantSelectionComplete(product, selected)) return null;

  const variants = /** @type {Record<string, unknown>[]} */ (product.variants);
  return (
    variants.find((variant) => {
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
 *
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, unknown> | null} [variant]
 * @returns {Record<string, unknown> | null}
 */
export function resolveVariantForAdd(product, variant = null) {
  if (!productHasVariants(product)) return null;

  const variants = /** @type {Record<string, unknown>[]} */ (product.variants);

  if (variant?.id != null) {
    const match = variants.find((entry) => String(entry.id) === String(variant.id));
    return match ?? null;
  }

  return variants.find((entry) => Number(entry.stock) > 0) ?? null;
}

/**
 * Cart line identity: variant id when present, otherwise product id.
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, unknown> | null} [variant]
 * @returns {string}
 */
export function cartLineKey(product, variant = null) {
  if (variant?.id != null) return String(variant.id);
  if (product?.variantId != null) return String(product.variantId);
  return String(product?.id ?? "");
}

/**
 * Human-readable selected options, e.g. "Blue / M".
 * @param {Record<string, string> | null | undefined} options
 * @returns {string}
 */
export function formatSelectedOptions(options) {
  if (!options || typeof options !== "object") return "";
  return Object.values(options)
    .filter((value) => typeof value === "string" && value.trim())
    .join(" / ");
}

/**
 * Whether a specific option value still has any purchasable variant,
 * given the other currently selected options.
 *
 * @param {Record<string, unknown> | null | undefined} product
 * @param {string} optionName
 * @param {string} optionValue
 * @param {Record<string, string>} selected
 * @returns {boolean}
 */
export function isOptionValueAvailable(
  product,
  optionName,
  optionValue,
  selected,
) {
  if (!productHasVariants(product)) return true;

  const variants = /** @type {Record<string, unknown>[]} */ (product.variants);
  return variants.some((variant) => {
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
