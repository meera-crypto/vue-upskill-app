/**
 * Helpers for the product-details route.
 *
 * Canonical path (category + product slug):
 *   `/gadgets/wireless-headphones-pro`
 *
 * Legacy (still accepted; details page rewrites to the category path):
 *   `/product/wireless-headphones-pro`
 *   `/product?id=101&slug=…`
 *   `/products/:id`
 *
 * Variant picks sync via `?opts=` (and optional `?variant=`) so hard refresh
 * and shared links keep the selection. `history.state` is a soft-nav hint;
 * query wins on hydrate.
 */
import { resolveStorefrontCategory } from "@/utils/categoryGroups.js";

/**
 * True when this route name is a product-details page (scoped or legacy).
 * @param {unknown} name
 */
export function isProductDetailsRouteName(name) {
  return (
    name === "product-details" ||
    name === "product-details-unscoped" ||
    name === "product-details-legacy"
  );
}

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
 * Resolve selected options from the URL query and/or navigation state.
 * Prefers durable `?opts=` / `?variant=` (survives hard refresh), then
 * `history.state.selectedOptions` from soft in-app navigation.
 *
 * @param {Record<string, unknown> | null | undefined} product
 * @param {Record<string, unknown>} query
 * @param {unknown} [historyState]
 * @returns {Record<string, string>}
 */
export function selectedOptionsFromNavigation(product, query, historyState) {
  const fromQuery = selectedOptionsFromQuery(product, query);
  if (Object.keys(fromQuery).length > 0) return fromQuery;

  const state =
    historyState && typeof historyState === "object"
      ? /** @type {Record<string, unknown>} */ (historyState)
      : null;

  if (state?.selectedOptions && typeof state.selectedOptions === "object") {
    return sanitizeVariantOptions(
      product,
      /** @type {Record<string, string>} */ (state.selectedOptions),
    );
  }

  return {};
}

/**
 * Resolve selected options from a details route query (legacy bookmarks).
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
 * Build shareable variant query keys from a selected-options map.
 * @param {Record<string, string> | null | undefined} selected
 * @param {{ id?: unknown, variantId?: unknown, variants?: unknown } | null | undefined} [product]
 * @returns {Record<string, string>}
 */
export function variantQueryFromSelected(selected, product = null) {
  /** @type {Record<string, string>} */
  const query = {};
  if (!selected || typeof selected !== "object") return query;

  const opts = encodeVariantOptions(selected);
  if (!opts) return query;

  query.opts = opts;

  let variantId =
    product?.variantId != null && String(product.variantId)
      ? String(product.variantId)
      : "";

  if (!variantId && Array.isArray(product?.variants)) {
    const match = product.variants.find((entry) => {
      if (!entry?.options || typeof entry.options !== "object") return false;
      return Object.entries(selected).every(
        ([name, value]) => entry.options[name] === value,
      );
    });
    if (match?.id != null) variantId = String(match.id);
  }

  if (variantId) query.variant = variantId;
  return query;
}

/**
 * @param {{
 *   id?: unknown,
 *   slug?: unknown,
 *   category?: unknown,
 *   selectedOptions?: unknown,
 *   variantId?: unknown,
 *   variants?: unknown,
 * } | number | string} productOrId
 * @param {string | {
 *   slug?: string,
 *   category?: string | null,
 *   selectedOptions?: Record<string, string> | null,
 * }} [slugOrOptions]
 * @returns {{
 *   name: string,
 *   params: { slug: string, category?: string },
 *   query?: Record<string, string>,
 *   state?: Record<string, unknown>,
 * }}
 */
export function productDetailsTo(productOrId, slugOrOptions) {
  const fromObject =
    productOrId != null && typeof productOrId === "object" ? productOrId : null;

  const id = fromObject ? fromObject.id : productOrId;

  /** @type {{
   *   slug?: string,
   *   category?: string | null,
   *   selectedOptions?: Record<string, string> | null,
   * }} */
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

  let slug =
    typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : "";

  // Last resort when only an id is known (should be rare — cards always have slug).
  if (!slug && id != null && String(id)) {
    slug = `id-${String(id)}`;
  }

  const category = resolveStorefrontCategory(
    extras.category != null && extras.category !== ""
      ? extras.category
      : fromObject?.category,
  );

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

  /** @type {{
   *   name: string,
   *   params: { slug: string, category?: string },
   *   query?: Record<string, string>,
   *   state?: Record<string, unknown>,
   * }} */
  const location = category
    ? {
        name: "product-details",
        params: { category, slug },
      }
    : {
        // No category yet (rare) — flat path; sync upgrades after load.
        name: "product-details-unscoped",
        params: { slug },
      };

  if (selected && Object.keys(selected).length > 0) {
    const query = variantQueryFromSelected(selected, fromObject);
    if (Object.keys(query).length > 0) {
      location.query = query;
    }

    /** @type {Record<string, unknown>} */
    const state = { selectedOptions: { ...selected } };
    if (query.variant) state.variantId = query.variant;
    location.state = state;
  }

  return location;
}
