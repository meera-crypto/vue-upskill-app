/**
 * productSearch — pure helpers for matching products against a search query.
 *
 * Shared by listing search, suggestions, and productService.searchProducts().
 */

/**
 * Case-insensitive partial match on title, brand, tags, or category.
 *
 * @param {Record<string, unknown>} product
 * @param {string} query already trimmed + lowercased, or any string
 * @returns {boolean}
 */
export function productMatchesSearch(product, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;

  const title = String(product?.title ?? "").toLowerCase();
  if (title.includes(q)) return true;

  const brand = String(product?.brand ?? "").toLowerCase();
  if (brand.includes(q)) return true;

  const category = String(product?.category ?? "").toLowerCase();
  if (category.includes(q)) return true;

  const categoryLabel = String(product?.categoryLabel ?? "").toLowerCase();
  if (categoryLabel.includes(q)) return true;

  const tags = Array.isArray(product?.tags) ? product.tags : [];
  return tags.some((tag) => String(tag).toLowerCase().includes(q));
}

/**
 * First tag that contains the query (for suggestion meta), or "".
 * @param {Record<string, unknown>} product
 * @param {string} query
 * @returns {string}
 */
export function matchingProductTag(product, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return "";

  const tags = Array.isArray(product?.tags) ? product.tags : [];
  for (const tag of tags) {
    const label = String(tag ?? "").trim();
    if (label && label.toLowerCase().includes(q)) return label;
  }
  return "";
}

/**
 * Secondary suggestion line: brand, matching tag, or category — so tag-only
 * / brand-only / category-only hits still show why they matched.
 * @param {Record<string, unknown>} product
 * @param {string} query
 * @returns {string}
 */
export function matchingSearchMeta(product, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return String(product?.brand ?? "").trim();

  const title = String(product?.title ?? "").toLowerCase();
  if (title.includes(q)) {
    return String(product?.brand ?? "").trim();
  }

  const brand = String(product?.brand ?? "").trim();
  if (brand && brand.toLowerCase().includes(q)) return brand;

  const tag = matchingProductTag(product, q);
  if (tag) return tag;

  const categoryLabel = String(
    product?.categoryLabel || product?.category || "",
  ).trim();
  if (categoryLabel && categoryLabel.toLowerCase().includes(q)) {
    return categoryLabel;
  }

  return brand;
}
