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
import type { HistoryState } from "vue-router";
import type { CartLineProduct } from "@/types/product";
import { resolveStorefrontCategory } from "@/utils/categoryGroups";

/**
 * Any product-like object we can build a details link from (a catalog
 * `Product`, a cart line product, or a partial hand-built object).
 */
export type ProductRouteSource = Partial<
  Pick<
    CartLineProduct,
    | "id"
    | "slug"
    | "category"
    | "options"
    | "variants"
    | "variantId"
    | "selectedOptions"
  >
>;

export interface ProductDetailsExtras {
  slug?: string;
  category?: string | null;
  selectedOptions?: Record<string, string> | null;
}

export interface ProductDetailsLocation {
  name: string;
  params: { slug: string; category?: string };
  query?: Record<string, string>;
  state?: HistoryState;
}

/**
 * True when this route name is a product-details page (scoped or legacy).
 */
export function isProductDetailsRouteName(name: unknown): boolean {
  return (
    name === "product-details" ||
    name === "product-details-unscoped" ||
    name === "product-details-legacy"
  );
}

/**
 * Encode `{ Color: "Blue", Size: "M" }` → `Color:Blue|Size:M` (URI-encoded parts).
 */
export function encodeVariantOptions(
  selected: Record<string, string> | null | undefined,
): string {
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
 */
export function decodeVariantOptions(raw: unknown): Record<string, string> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.trim()) return {};

  const next: Record<string, string> = {};
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
 */
export function sanitizeVariantOptions(
  product: ProductRouteSource | null | undefined,
  selected: Record<string, string>,
): Record<string, string> {
  const options = Array.isArray(product?.options) ? product.options : [];
  if (options.length === 0 || !selected || typeof selected !== "object") {
    return {};
  }

  const next: Record<string, string> = {};
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
 */
export function selectedOptionsFromNavigation(
  product: ProductRouteSource | null | undefined,
  query: Record<string, unknown>,
  historyState?: unknown,
): Record<string, string> {
  const fromQuery = selectedOptionsFromQuery(product, query);
  if (Object.keys(fromQuery).length > 0) return fromQuery;

  const state =
    historyState && typeof historyState === "object"
      ? (historyState as Record<string, unknown>)
      : null;

  if (state?.selectedOptions && typeof state.selectedOptions === "object") {
    return sanitizeVariantOptions(
      product,
      state.selectedOptions as Record<string, string>,
    );
  }

  return {};
}

/**
 * Resolve selected options from a details route query (legacy bookmarks).
 * Prefers `opts=`; falls back to matching `variant=` against product.variants.
 */
export function selectedOptionsFromQuery(
  product: ProductRouteSource | null | undefined,
  query: Record<string, unknown>,
): Record<string, string> {
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

  return sanitizeVariantOptions(product, { ...match.options });
}

/**
 * Build shareable variant query keys from a selected-options map.
 */
export function variantQueryFromSelected(
  selected: Record<string, string> | null | undefined,
  product: ProductRouteSource | null | undefined = null,
): Record<string, string> {
  const query: Record<string, string> = {};
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

export function productDetailsTo(
  productOrId: ProductRouteSource | number | string,
  slugOrOptions?: string | ProductDetailsExtras,
): ProductDetailsLocation {
  const fromObject =
    productOrId != null && typeof productOrId === "object" ? productOrId : null;

  const id = fromObject ? fromObject.id : productOrId;

  let extras: ProductDetailsExtras = {};
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
      ? fromObject.selectedOptions
      : null;

  const selected = selectedFromArg || selectedFromProduct;

  const location: ProductDetailsLocation = category
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

    const state: HistoryState = { selectedOptions: { ...selected } };
    if (query.variant) state.variantId = query.variant;
    location.state = state;
  }

  return location;
}
