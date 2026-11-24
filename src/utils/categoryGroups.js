/**
 * Storefront category groups — DummyJSON ships fine-grained slugs;
 * we fold a few of them into broader chips for the listing strip.
 *
 * Groups:
 * - beauty      ← beauty, fragrances
 * - mens        ← mens-shirts, mens-shoes, mens-watches
 * - womens      ← tops, womens-bags, womens-dresses, womens-jewellery,
 *                 womens-shoes, womens-watches
 * - gadgets     ← smartphones, laptops, tablets, mobile-accessories
 * - home        ← home-decoration
 * - kitchen     ← kitchen-accessories
 * - sports      ← sports-accessories
 *
 * Every other DummyJSON slug stays as-is (with optional display labels).
 */

/** @type {Record<string, string>} DummyJSON source slug → storefront slug */
const SOURCE_TO_STOREFRONT = {
  beauty: "beauty",
  fragrances: "beauty",
  "mens-shirts": "mens",
  "mens-shoes": "mens",
  "mens-watches": "mens",
  tops: "womens",
  "womens-bags": "womens",
  "womens-dresses": "womens",
  "womens-jewellery": "womens",
  "womens-shoes": "womens",
  "womens-watches": "womens",
  smartphones: "gadgets",
  laptops: "gadgets",
  tablets: "gadgets",
  "mobile-accessories": "gadgets",
  "home-decoration": "home",
  "kitchen-accessories": "kitchen",
  "sports-accessories": "sports",
};

/** Display labels for storefront slugs (chips, banners, breadcrumbs). */
const STOREFRONT_LABELS = {
  beauty: "Beauty",
  mens: "Mens",
  womens: "Womens",
  gadgets: "Gadgets",
  furniture: "Furniture",
  groceries: "Groceries",
  home: "Home",
  kitchen: "Kitchen",
  "skin-care": "Skin Care",
  sports: "Sports",
  sunglasses: "Sunglasses",
  motorcycle: "Motorcycle",
  vehicle: "Vehicle",
};

/**
 * Category page banner copy (CategoryBanner).
 * Keys must match storefront slugs from resolveStorefrontCategory.
 * @type {Record<string, { description: string, tags: string[] }>}
 */
const CATEGORY_BANNERS = {
  beauty: {
    description:
      "Skincare, makeup, and fragrance — clear pricing and trusted ratings for everyday routines.",
    tags: ["Skincare", "Makeup", "Fragrance", "Self-care"],
  },
  mens: {
    description:
      "Shirts, shoes, and watches for everyday style — shop Mens with filters that stay in sync.",
    tags: ["Shirts", "Shoes", "Watches"],
  },
  womens: {
    description:
      "Tops, dresses, bags, shoes, and jewellery — curated Womens picks with clear stock and prices.",
    tags: ["Tops", "Dresses", "Bags", "Shoes", "Jewellery"],
  },
  gadgets: {
    description:
      "Smartphones, laptops, tablets, and accessories — tech essentials in one Gadgets aisle.",
    tags: ["Phones", "Laptops", "Tablets", "Accessories"],
  },
  furniture: {
    description:
      "Comfortable, practical pieces for living spaces — browse furniture with ratings you can trust.",
    tags: ["Living", "Seating", "Storage"],
  },
  groceries: {
    description:
      "Everyday pantry and kitchen staples — groceries with transparent pricing.",
    tags: ["Pantry", "Kitchen", "Essentials"],
  },
  home: {
    description:
      "Accents and décor to refresh a room — home decoration with clear product details.",
    tags: ["Décor", "Accents", "Style"],
  },
  kitchen: {
    description:
      "Tools and accessories for cooking and prep — practical kitchen finds.",
    tags: ["Cookware", "Prep", "Tools"],
  },
  "skin-care": {
    description:
      "Routines and treatments for healthy-looking skin — shop skin care with ratings in view.",
    tags: ["Cleansers", "Moisturizers", "Care"],
  },
  sports: {
    description:
      "Gear for training and outdoor play — sports accessories ready to filter and sort.",
    tags: ["Training", "Outdoor", "Gear"],
  },
  sunglasses: {
    description:
      "Frames and lenses for sun and style — sunglasses with brand and price filters.",
    tags: ["Frames", "Style", "Sun"],
  },
  motorcycle: {
    description:
      "Parts and kit for the ride — motorcycle picks with stock you can check.",
    tags: ["Ride", "Parts", "Kit"],
  },
  vehicle: {
    description:
      "Automotive essentials and accessories — vehicle finds in one place.",
    tags: ["Auto", "Parts", "Accessories"],
  },
};

/**
 * Map a DummyJSON (or legacy URL) category slug to the storefront slug.
 * Unknown / empty values pass through unchanged (trimmed).
 *
 * @param {unknown} source
 * @returns {string}
 */
export function resolveStorefrontCategory(source) {
  const raw = typeof source === "string" ? source.trim() : "";
  if (!raw) return "";
  const key = raw.toLowerCase();
  return SOURCE_TO_STOREFRONT[key] ?? key;
}

/**
 * Human-readable label for a storefront category slug.
 *
 * @param {unknown} category
 * @returns {string}
 */
export function storefrontCategoryLabel(category) {
  const slug = resolveStorefrontCategory(category);
  if (!slug) return "";
  if (STOREFRONT_LABELS[slug]) return STOREFRONT_LABELS[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * True when `slug` is a legacy DummyJSON slug that now lives under a group
 * (e.g. `/smartphones` → `/gadgets`). Used for URL redirects.
 *
 * @param {unknown} slug
 * @returns {boolean}
 */
export function isLegacyCategorySlug(slug) {
  const raw = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!raw || !(raw in SOURCE_TO_STOREFRONT)) return false;
  return SOURCE_TO_STOREFRONT[raw] !== raw;
}

/**
 * Banner content for a category page (`/:category`).
 *
 * @param {unknown} category
 * @returns {{ slug: string, label: string, description: string, tags: string[] } | null}
 */
export function getCategoryBanner(category) {
  const slug = resolveStorefrontCategory(category);
  if (!slug) return null;

  const label = storefrontCategoryLabel(slug);
  const known = CATEGORY_BANNERS[slug];
  if (known) {
    return {
      slug,
      label,
      description: known.description,
      tags: [...known.tags],
    };
  }

  return {
    slug,
    label,
    description: `Browse ${label} — filter by brand, price, and more to find what fits.`,
    tags: [label],
  };
}
