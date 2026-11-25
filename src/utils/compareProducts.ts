/**
 * Product comparison helpers for the details page.
 *
 * Compare pool:
 * - Same category (required)
 * - All tags matched (required): normalized tag sets must be identical
 *   and non-empty — every tag on A is on B and vice versa
 * - Any brand allowed
 * - Not the same product id
 *
 * Tags are used only for matching peers, not shown in the spec table.
 *
 * Ranking: higher rating first, then id.
 * Table columns: current product + 1–3 peers (2–4 total).
 */

import type { Product } from "@/types/product";

/** Minimum products in a comparison (current + at least one peer). */
export const COMPARE_MIN = 2;

/** Maximum products in a comparison (current + up to 3 peers). */
export const COMPARE_MAX = 4;

export function normalizeCompareTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const tag = entry.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags.sort((a, b) => a.localeCompare(b));
}

/**
 * True when both products have the same non-empty tag set.
 */
export function tagsFullyMatch(
  source: Product | null | undefined,
  candidate: Product | null | undefined,
): boolean {
  const sourceTags = normalizeCompareTags(source?.tags);
  const candidateTags = normalizeCompareTags(candidate?.tags);
  if (sourceTags.length === 0 || candidateTags.length === 0) return false;
  if (sourceTags.length !== candidateTags.length) return false;
  return sourceTags.every((tag, index) => tag === candidateTags[index]);
}

/**
 * True when the candidate can be compared with the source product.
 * Same category + all tags matched; brands may differ.
 */
export function productMatchesCompare(
  source: Product | null | undefined,
  candidate: Product | null | undefined,
): boolean {
  if (!source || !candidate) return false;
  if (source.id != null && candidate.id === source.id) return false;

  const sourceCategory =
    typeof source.category === "string" ? source.category.trim() : "";
  const candidateCategory =
    typeof candidate.category === "string" ? candidate.category.trim() : "";
  if (!sourceCategory || sourceCategory !== candidateCategory) return false;

  return tagsFullyMatch(source, candidate);
}

/**
 * Ranked comparable peers from the catalog (excludes the source product).
 */
export function getComparableProducts(
  source: Product | null | undefined,
  catalog: readonly Product[],
): Product[] {
  if (!source || !Array.isArray(catalog) || catalog.length === 0) return [];

  const matched = catalog.filter((entry) =>
    productMatchesCompare(source, entry),
  );

  return matched.sort((a, b) => {
    const ratingA = typeof a?.rating === "number" ? a.rating : -1;
    const ratingB = typeof b?.rating === "number" ? b.rating : -1;
    if (ratingA !== ratingB) return ratingB - ratingA;

    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });
}

function textOrDash(value: unknown): string {
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

function formatPrice(product: Product): string {
  const price = Number(product?.price);
  if (!Number.isFinite(price) || price < 0) return "—";
  return `$${price.toFixed(2)}`;
}

function formatRating(product: Product): string {
  if (typeof product?.rating !== "number") return "—";
  const count =
    typeof product.reviewCount === "number" ? product.reviewCount : null;
  const rating = product.rating.toFixed(1);
  return count != null ? `${rating} (${count})` : rating;
}

function formatStock(product: Product): string {
  const stock = Number(product?.stock);
  if (!Number.isFinite(stock) || stock <= 0) return "Out of stock";
  return "In stock";
}

function formatDiscount(product: Product): string {
  const percent = Number(product?.discountPercentage);
  if (!Number.isFinite(percent) || percent <= 0) return "—";
  return `${Math.round(percent)}% off`;
}

/**
 * Spec rows for the comparison table.
 * Each row has one value per product column; `differs` when values are not all equal.
 * (No tags row — tags are match criteria only.)
 */
export interface CompareRow {
  key: string;
  label: string;
  values: string[];
  differs: boolean;
}

export function buildCompareRows(products: readonly Product[]): CompareRow[] {
  if (!Array.isArray(products) || products.length === 0) return [];

  const fields: {
    key: string;
    label: string;
    format: (p: Product) => string;
  }[] = [
    { key: "price", label: "Price", format: formatPrice },
    {
      key: "brand",
      label: "Brand",
      format: (p) => textOrDash(p.brand),
    },
    { key: "rating", label: "Rating", format: formatRating },
    { key: "stock", label: "Availability", format: formatStock },
    { key: "discount", label: "Discount", format: formatDiscount },
    {
      key: "category",
      label: "Category",
      format: (p) => textOrDash(p.categoryLabel || p.category),
    },
    {
      key: "warranty",
      label: "Warranty",
      format: (p) => textOrDash(p.warrantyInformation),
    },
    {
      key: "shipping",
      label: "Shipping",
      format: (p) => textOrDash(p.shippingInformation),
    },
    {
      key: "returns",
      label: "Returns",
      format: (p) => textOrDash(p.returnPolicy),
    },
  ];

  return fields.map(({ key, label, format }) => {
    const values = products.map((product) => format(product));
    const differs = new Set(values).size > 1;
    return { key, label, values, differs };
  });
}
