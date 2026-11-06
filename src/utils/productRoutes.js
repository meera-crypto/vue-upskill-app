/**
 * Helpers for the product-details route.
 *
 * Details uses query params (like the listing):
 *   `/product?id=101&slug=wireless-headphones-pro`
 *
 * - `id` drives the fetch (required)
 * - `slug` is for readable/shareable URLs (optional; filled in when known)
 */

/**
 * @param {{ id?: unknown, slug?: unknown } | number | string} productOrId
 * @param {string} [slugHint] when the first arg is a bare id
 * @returns {{ name: string, query: { id: string, slug?: string } }}
 */
export function productDetailsTo(productOrId, slugHint) {
  const fromObject =
    productOrId != null && typeof productOrId === "object"
      ? productOrId
      : null;

  const id = fromObject ? fromObject.id : productOrId;
  const rawSlug = fromObject
    ? fromObject.slug
    : typeof slugHint === "string"
      ? slugHint
      : "";

  const slug =
    typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : "";

  /** @type {{ id: string, slug?: string }} */
  const query = { id: String(id) };
  if (slug) query.slug = slug;

  return {
    name: "product-details",
    query,
  };
}
