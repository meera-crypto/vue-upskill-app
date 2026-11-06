/**
 * Similar-products helpers for the details page.
 *
 * How “similar” is decided (category + brand + tags):
 * - Prefer the same category when the product has one.
 * - Same brand and overlapping tags raise the rank (they are not hard
 *   filters — DummyJSON brands are often unique inside a category).
 * - If there is no category, fall back to same brand or shared tags.
 *
 * “View all” opens the listing with the category filter (and brand when
 * present) so shoppers can browse the full related set with pagination.
 */

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag ?? "").trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} source
 * @param {Record<string, unknown>} candidate
 * @returns {number}
 */
function sharedTagCount(source, candidate) {
  const sourceTags = new Set(normalizeTags(source?.tags));
  if (sourceTags.size === 0) return 0;

  let count = 0;
  for (const tag of normalizeTags(candidate?.tags)) {
    if (sourceTags.has(tag)) count += 1;
  }
  return count;
}

/**
 * @param {Record<string, unknown>} source
 * @returns {{ category: string, brand: string, tags: string[] }}
 */
function sourceSignals(source) {
  return {
    category:
      typeof source?.category === "string" ? source.category.trim() : "",
    brand: typeof source?.brand === "string" ? source.brand.trim() : "",
    tags: normalizeTags(source?.tags),
  };
}

/**
 * Relevance score for ranking (higher = more similar).
 * @param {Record<string, unknown>} source
 * @param {Record<string, unknown>} candidate
 * @returns {number}
 */
export function similarProductScore(source, candidate) {
  if (!source || !candidate) return 0;
  if (source.id != null && candidate.id === source.id) return 0;

  const { category, brand, tags } = sourceSignals(source);
  let score = 0;

  if (category && candidate.category === category) score += 4;
  if (brand && candidate.brand === brand) score += 3;
  if (tags.length > 0) score += sharedTagCount(source, candidate);

  return score;
}

/**
 * True when the candidate should appear in the similar row.
 * @param {Record<string, unknown>} source
 * @param {Record<string, unknown>} candidate
 * @returns {boolean}
 */
export function productMatchesSimilar(source, candidate) {
  if (!source || !candidate) return false;
  if (source.id != null && candidate.id === source.id) return false;

  const { category, brand, tags } = sourceSignals(source);
  if (!category && !brand && tags.length === 0) return false;

  // Category is the main “similar” bucket when we have one.
  if (category) return candidate.category === category;

  // No category — allow same brand or any shared tag.
  if (brand && candidate.brand === brand) return true;
  return sharedTagCount(source, candidate) > 0;
}

/**
 * Ranked similar products from a catalog (excludes the source product).
 * @param {Record<string, unknown> | null | undefined} source
 * @param {unknown[]} catalog
 * @returns {Record<string, unknown>[]}
 */
export function getSimilarProducts(source, catalog) {
  if (!source || !Array.isArray(catalog) || catalog.length === 0) return [];

  const matched = catalog.filter((entry) =>
    productMatchesSimilar(
      source,
      /** @type {Record<string, unknown>} */ (entry),
    ),
  );

  return matched.sort((a, b) => {
    const scoreDiff =
      similarProductScore(source, b) - similarProductScore(source, a);
    if (scoreDiff !== 0) return scoreDiff;

    const ratingA = typeof a?.rating === "number" ? a.rating : -1;
    const ratingB = typeof b?.rating === "number" ? b.rating : -1;
    if (ratingA !== ratingB) return ratingB - ratingA;

    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });
}

/**
 * Listing route for “View all” similar products.
 * Mirrors membership rules: category filter when we matched by category;
 * brand filter only as a no-category fallback.
 * @param {Record<string, unknown> | null | undefined} source
 * @returns {{ name: string, query: Record<string, string> } | null}
 */
export function similarProductsListingTo(source) {
  if (!source) return null;

  const { category, brand } = sourceSignals(source);

  /** @type {Record<string, string>} */
  const query = {};
  if (category) {
    query.category = category;
  } else if (brand) {
    query.brand = brand;
  }

  if (Object.keys(query).length === 0) return null;

  return { name: "products", query };
}
