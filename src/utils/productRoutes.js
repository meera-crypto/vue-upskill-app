/**
 * Helpers for the product-details route.
 *
 * Details uses query params (like the listing):
 *   `/product?id=101&slug=wireless-headphones-pro`
 *   `/product?id=83&slug=…&opts=Color%3ABlue%7CSize%3AM&variant=83-blue-m`
 *
 * - `id` drives the fetch (required)
 * - `slug` is for readable/shareable URLs (optional; filled in when known)
 * - `opts` carries selected variant options from quick view → details
 * - `variant` is the matched SKU id when selection is complete (optional)
 */

/**
 * Encode `{ Color: "Blue", Size: "M" }` → `Color:Blue|Size:M` (URI-encoded parts).
 * @param {Record<string, string> | null | undefined} selected
 * @returns {string}
 */
export function encodeVariantOptions(selected) {
  if (!selected || typeof selected !== "object") return "";
  return Object.entries(selected)
    .filter(
      ([name, value]) =>
        typeof name === "string" &&
        name.trim() &&
        typeof value === "string" &&
        value.trim(),
    )
    .map(
      ([name, value]) =>
        `${encodeURIComponent(name.trim())}:${encodeURIComponent(value.trim())}`,
    )
    .join("|");
}

/**
 * Decode `opts` query back into a selected-options map.
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function decodeVariantOptions(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.trim()) return {};

  /** @type {Record<string, string>} */
  const next = {};
  for (const part of value.split("|")) {
    const sep = part.indexOf(":");
    if (sep < 1) continue;
    try {
      const name = decodeURIComponent(part.slice(0, sep)).trim();
      const optionValue = decodeURIComponent(part.slice(sep + 1)).trim();
      if (name && optionValue) next[name] = optionValue;
    } catch {
      /* ignore malformed segment */
    }
  }
  return next;
}

/**
 * Keep only option values that exist on the product (drop stale URL junk).
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, string>} selected
 * @returns {Record<string, string>}
 */
export function sanitizeVariantOptions(product, selected) {
  const options = Array.isArray(product?.options) ? product.options : [];
  if (options.length === 0 || !selected || typeof selected !== "object") {
    return {};
  }

  /** @type {Record<string, string>} */
  const next = {};
  for (const group of options) {
    if (!group || typeof group.name !== "string") continue;
    const value = selected[group.name];
    if (typeof value !== "string" || !value) continue;
    const values = Array.isArray(group.values) ? group.values : [];
    if (values.includes(value)) next[group.name] = value;
  }
  return next;
}

/**
 * Resolve selected options from a details route query.
 * Prefers `opts=`; falls back to matching `variant=` against product.variants.
 *
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, unknown>} query
 * @returns {Record<string, string>}
 */
export function selectedOptionsFromQuery(product, query) {
  const fromOpts = sanitizeVariantOptions(
    product,
    decodeVariantOptions(query?.opts),
  );
  if (Object.keys(fromOpts).length > 0) return fromOpts;

  const rawVariant = Array.isArray(query?.variant)
    ? query.variant[0]
    : query?.variant;
  if (rawVariant == null || rawVariant === "") return {};

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const match = variants.find(
    (entry) => entry && String(entry.id) === String(rawVariant),
  );
  if (!match?.options || typeof match.options !== "object") return {};

  return sanitizeVariantOptions(
    product,
    /** @type {Record<string, string>} */ ({ ...match.options }),
  );
}

/**
 * @param {{ id?: unknown, slug?: unknown, selectedOptions?: unknown, variantId?: unknown, variants?: unknown } | number | string} productOrId
 * @param {string | { slug?: string, selectedOptions?: Record<string, string> | null }} [slugOrOptions]
 * @returns {{ name: string, query: Record<string, string> }}
 */
export function productDetailsTo(productOrId, slugOrOptions) {
  const fromObject =
    productOrId != null && typeof productOrId === "object"
      ? productOrId
      : null;

  const id = fromObject ? fromObject.id : productOrId;

  /** @type {{ slug?: string, selectedOptions?: Record<string, string> | null }} */
  let extras = {};
  if (typeof slugOrOptions === "string") {
    extras = { slug: slugOrOptions };
  } else if (slugOrOptions && typeof slugOrOptions === "object") {
    extras = slugOrOptions;
  }

  const rawSlug = fromObject
    ? fromObject.slug
    : typeof extras.slug === "string"
      ? extras.slug
      : "";

  const slug =
    typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : "";

  /** @type {Record<string, string>} */
  const query = { id: String(id) };
  if (slug) query.slug = slug;

  const selectedFromArg =
    extras.selectedOptions && typeof extras.selectedOptions === "object"
      ? extras.selectedOptions
      : null;
  const selectedFromProduct =
    fromObject?.selectedOptions &&
    typeof fromObject.selectedOptions === "object"
      ? /** @type {Record<string, string>} */ (fromObject.selectedOptions)
      : null;

  const selected = selectedFromArg || selectedFromProduct;
  const opts = encodeVariantOptions(selected);
  if (opts) query.opts = opts;

  if (fromObject?.variantId != null && String(fromObject.variantId)) {
    query.variant = String(fromObject.variantId);
  } else if (selected && Array.isArray(fromObject?.variants)) {
    const match = fromObject.variants.find((entry) => {
      if (!entry?.options || typeof entry.options !== "object") return false;
      return Object.entries(selected).every(
        ([name, value]) => entry.options[name] === value,
      );
    });
    if (match?.id != null) query.variant = String(match.id);
  }

  return {
    name: "product-details",
    query,
  };
}
