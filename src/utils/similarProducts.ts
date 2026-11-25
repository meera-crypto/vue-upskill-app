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

import type { Product } from "@/types/product";
import type { ListingLocation } from "@/utils/listingRoutes";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) =>
      String(tag ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

function sharedTagCount(source: Product, candidate: Product): number {
  const sourceTags = new Set(normalizeTags(source?.tags));
  if (sourceTags.size === 0) return 0;

  let count = 0;
  for (const tag of normalizeTags(candidate?.tags)) {
    if (sourceTags.has(tag)) count += 1;
  }
  return count;
}

function sourceSignals(source: Product): {
  category: string;
  brand: string;
  tags: string[];
} {
  return {
    category:
      typeof source?.category === "string" ? source.category.trim() : "",
    brand: typeof source?.brand === "string" ? source.brand.trim() : "",
    tags: normalizeTags(source?.tags),
  };
}

/**
 * Relevance score for ranking (higher = more similar).
 */
export function similarProductScore(
  source: Product | null | undefined,
  candidate: Product | null | undefined,
): number {
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
 */
export function productMatchesSimilar(
  source: Product | null | undefined,
  candidate: Product | null | undefined,
): boolean {
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
 */
export function getSimilarProducts(
  source: Product | null | undefined,
  catalog: readonly Product[],
): Product[] {
  if (!source || !Array.isArray(catalog) || catalog.length === 0) return [];

  const matched = catalog.filter((entry) =>
    productMatchesSimilar(source, entry),
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
 * Mirrors membership rules: category path when we matched by category;
 * brand query only as a no-category fallback.
 */
export function similarProductsListingTo(
  source: Product | null | undefined,
): ListingLocation | null {
  if (!source) return null;

  const { category, brand } = sourceSignals(source);

  if (category) {
    return {
      name: "products-category",
      params: { category },
      query: {},
    };
  }

  if (brand) {
    return { name: "products", query: { brand } };
  }

  return null;
}
