/**
 * productService — talks to DummyJSON, maps responses into our product shape,
 * and returns data ready for Vue components.
 *
 * Keeping fetch + mapping here (not in components) makes the API easy to swap
 * later and keeps Vue components focused on UI + state.
 *
 * Variant note: if the API product already includes `options` + `variants`, we
 * normalize those into our app shape. Otherwise selected DummyJSON ids get a
 * local overlay from `productVariants.js` so the details page can practise
 * selection today.
 *
 * Docs: https://dummyjson.com/docs/products
 */

import { PRODUCT_VARIANT_OVERLAYS } from "@/data/productVariants.js";

const API_BASE = "https://dummyjson.com";

/** Shown when a product has no usable image URL (neutral SVG placeholder). */
export const PRODUCT_IMAGE_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="Product image unavailable">
      <rect width="300" height="300" fill="#e8e6e3"/>
      <text x="150" y="155" text-anchor="middle" fill="#8a8580" font-family="system-ui,sans-serif" font-size="16">No image</text>
    </svg>`,
  );

/**
 * Turn a title into a URL-friendly slug.
 * @param {string} title
 */
function slugify(title) {
  return String(title ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * True only for a real, displayable discount (requirements: no misleading savings).
 * - percent must be finite, > 0, < 100
 * - rounded label must be at least 1% (avoids “0% off”)
 * - original price must be a number higher than the sale price
 *
 * @param {{ price?: unknown, originalPrice?: unknown, discountPercentage?: unknown }} product
 * @returns {boolean}
 */
export function hasValidDiscount(product) {
  const price = Number(product?.price);
  const original = Number(product?.originalPrice);
  const percent = Number(product?.discountPercentage);

  if (!Number.isFinite(price) || price < 0) return false;
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return false;
  if (Math.round(percent) < 1) return false;
  if (!Number.isFinite(original) || original <= price) return false;

  return true;
}

/**
 * DummyJSON's `price` is the current (sale) price.
 * Rebuild original price from discountPercentage when the discount is valid.
 * @param {number} price
 * @param {number} discountPercentage
 * @returns {number | null}
 */
function originalPriceFromDiscount(price, discountPercentage) {
  const current = Number(price);
  const discount = Number(discountPercentage);

  if (!Number.isFinite(current) || current < 0) return null;
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    return null;
  }
  if (Math.round(discount) < 1) return null;

  return Number((current / (1 - discount / 100)).toFixed(2));
}

/**
 * Normalize API discount % — 0 means “no discount to show”.
 * @param {unknown} discountPercentage
 * @returns {number}
 */
function sanitizeDiscountPercentage(discountPercentage) {
  const discount = Number(discountPercentage);
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    return 0;
  }
  if (Math.round(discount) < 1) return 0;
  return discount;
}

/**
 * DummyJSON does not ship a colors field. Pull named colors from title /
 * description so the listing can offer color swatch filters.
 * @param {string} title
 * @param {string} description
 * @returns {string[]}
 */
const KNOWN_COLORS = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "purple",
  "brown",
  "grey",
  "orange",
  "beige",
  "gold",
  "silver",
  "navy",
  "cream",
];

/** CSS hex values for filter swatches (keys match extracted color names). */
export const COLOR_SWATCH_HEX = {
  black: "#1a1a1a",
  white: "#f5f5f5",
  red: "#c62828",
  blue: "#1565c0",
  green: "#2e7d32",
  yellow: "#f9a825",
  pink: "#c2185b",
  purple: "#6a1b9a",
  brown: "#6d4c41",
  grey: "#757575",
  orange: "#ef6c00",
  beige: "#d7ccc8",
  gold: "#c9a227",
  silver: "#b0bec5",
  navy: "#1a237e",
  cream: "#fff8e7",
};

function extractColors(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set();

  for (const color of KNOWN_COLORS) {
    const pattern = new RegExp(`\\b${color}\\b`, "i");
    if (pattern.test(text)) found.add(color);
  }

  // Treat American "gray" as the same option as "grey".
  if (/\bgray\b/i.test(text)) found.add("grey");

  return [...found];
}

/**
 * Turn a DummyJSON category slug into a readable label.
 * @param {string} category
 */
export function formatCategoryLabel(category) {
  return String(category ?? "")
    .trim()
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Map one DummyJSON product into our app product model.
 * @param {Record<string, unknown>} raw
 */
function mapDummyProduct(raw) {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : "Untitled product";

  const description =
    typeof raw.description === "string" ? raw.description : "";

  const price = Number(raw.price);
  const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
  const safeDiscount = sanitizeDiscountPercentage(raw.discountPercentage);
  const originalPrice = originalPriceFromDiscount(safePrice, safeDiscount);
  /** Drop % if we couldn’t derive a higher original price. */
  const displayDiscount =
    originalPrice != null && originalPrice > safePrice ? safeDiscount : 0;

  const images = Array.isArray(raw.images)
    ? raw.images.filter((url) => typeof url === "string" && url.length > 0)
    : [];

  if (
    images.length === 0 &&
    typeof raw.thumbnail === "string" &&
    raw.thumbnail
  ) {
    images.push(raw.thumbnail);
  }

  const image = images[0] ?? PRODUCT_IMAGE_FALLBACK;
  /** Smaller URL when DummyJSON provides one — used in <picture> on mobile. */
  const thumbnail =
    typeof raw.thumbnail === "string" && raw.thumbnail.trim()
      ? raw.thumbnail.trim()
      : image;
  const stock = Number(raw.stock);
  const rawReviews = Array.isArray(raw.reviews) ? raw.reviews : [];
  const reviews = rawReviews
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const review = /** @type {Record<string, unknown>} */ (entry);
      const reviewRating = Number(review.rating);
      return {
        rating: Number.isFinite(reviewRating) ? reviewRating : null,
        comment:
          typeof review.comment === "string" ? review.comment.trim() : "",
        date: typeof review.date === "string" ? review.date : "",
        reviewerName:
          typeof review.reviewerName === "string"
            ? review.reviewerName.trim()
            : "Customer",
      };
    })
    .filter(Boolean);
  const rating = typeof raw.rating === "number" ? raw.rating : null;
  const category = typeof raw.category === "string" ? raw.category : "";
  const meta =
    raw.meta && typeof raw.meta === "object"
      ? /** @type {Record<string, unknown>} */ (raw.meta)
      : {};
  const createdAt =
    typeof meta.createdAt === "string" && meta.createdAt
      ? meta.createdAt
      : null;

  /**
   * DummyJSON has no dedicated sales field. Map review volume onto
   * `salesCount` so Best Seller can sort by that field (requirements §3.4).
   */
  const salesCount = reviews.length;

  /** Featured: strong rating and/or meaningful discount. */
  const isFeatured =
    (rating != null && rating >= 4) || displayDiscount >= 15;

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag) => typeof tag === "string" && tag.trim())
    : [];

  /**
   * Variants: prefer API payload when present; else local overlay by id.
   * PDP / cart only care about the normalized `options` + `variants` shape.
   */
  const { options, variants, stock: variantStock, colors: variantColors } =
    resolveProductVariants(raw, images);

  const apiColors = normalizeColorList(raw.colors);
  const mappedColors =
    apiColors.length > 0
      ? apiColors
      : variantColors.length > 0
        ? variantColors
        : extractColors(title, description);

  const mappedStock =
    variants.length > 0
      ? variantStock
      : Number.isFinite(stock) && stock > 0
        ? stock
        : 0;

  return {
    id: raw.id,
    title,
    /** Alias of title — used by current ProductCard templates. */
    name: title,
    slug: slugify(title),
    brand: typeof raw.brand === "string" ? raw.brand : "",
    category,
    categoryLabel: formatCategoryLabel(category),
    description,
    price: safePrice,
    originalPrice: displayDiscount > 0 ? originalPrice : null,
    discountPercentage: displayDiscount,
    rating,
    reviewCount: reviews.length > 0 ? reviews.length : null,
    /** Used by Best Seller sort (DummyJSON proxy — see comment above). */
    salesCount,
    createdAt,
    stock: mappedStock,
    images: images.length > 0 ? images : [PRODUCT_IMAGE_FALLBACK],
    /** Primary (larger) image for cards / tablet+. */
    image,
    /** Prefer for narrow viewports via <picture> <source>. */
    thumbnail,
    colors: mappedColors,
    /** From API variants when present; otherwise local overlay (or empty). */
    options,
    variants,
    isFeatured,
    /** Detail-page extras from DummyJSON (safe empty defaults for listing). */
    reviews,
    tags,
    sku: typeof raw.sku === "string" ? raw.sku : "",
    warrantyInformation:
      typeof raw.warrantyInformation === "string"
        ? raw.warrantyInformation
        : "",
    shippingInformation:
      typeof raw.shippingInformation === "string"
        ? raw.shippingInformation
        : "",
    returnPolicy:
      typeof raw.returnPolicy === "string" ? raw.returnPolicy : "",
    availabilityStatus:
      typeof raw.availabilityStatus === "string"
        ? raw.availabilityStatus
        : "",
  };
}

/**
 * Choose a variant source: API fields first, then local overlay by id.
 * @param {Record<string, unknown>} raw
 * @param {string[]} images
 */
function resolveProductVariants(raw, images) {
  const fromApi = normalizeVariantSource(
    {
      options: raw.options,
      variants: raw.variants,
    },
    images,
  );
  if (fromApi.variants.length > 0) return fromApi;

  const overlay = PRODUCT_VARIANT_OVERLAYS[Number(raw.id)];
  return normalizeVariantSource(overlay, images);
}

/**
 * Normalize API or local `{ options, variants }` into the app variant shape.
 * Accepts a few common aliases so a future API swap is less brittle.
 *
 * @param {{ options?: unknown, variants?: unknown } | null | undefined} source
 * @param {string[]} images
 */
function normalizeVariantSource(source, images) {
  if (!source || typeof source !== "object") {
    return { options: [], variants: [], stock: 0, colors: [] };
  }

  const variants = normalizeVariants(source.variants, images);
  if (variants.length === 0) {
    return { options: [], variants: [], stock: 0, colors: [] };
  }

  let options = normalizeOptions(source.options);
  if (options.length === 0) {
    options = deriveOptionsFromVariants(variants);
  }

  const stockTotal = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const colors = colorsFromOptions(options);

  return { options, variants, stock: stockTotal, colors };
}

/**
 * @param {unknown} rawOptions
 * @returns {{ name: string, values: string[] }[]}
 */
function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const entry = /** @type {Record<string, unknown>} */ (option);
      const name =
        typeof entry.name === "string"
          ? entry.name.trim()
          : typeof entry.title === "string"
            ? entry.title.trim()
            : "";
      if (!name) return null;

      /** Support `{ values: string[] }` and Shopify-like `{ optionValues: [{ name }] }`. */
      let values = [];
      if (Array.isArray(entry.values)) {
        values = entry.values
          .map((value) => {
            if (typeof value === "string") return value.trim();
            if (value && typeof value === "object" && "name" in value) {
              return String(
                /** @type {{ name?: unknown }} */ (value).name ?? "",
              ).trim();
            }
            return "";
          })
          .filter(Boolean);
      } else if (Array.isArray(entry.optionValues)) {
        values = entry.optionValues
          .map((value) => {
            if (!value || typeof value !== "object") return "";
            return String(
              /** @type {{ name?: unknown }} */ (value).name ?? "",
            ).trim();
          })
          .filter(Boolean);
      }

      if (values.length === 0) return null;
      return { name, values: [...new Set(values)] };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} rawVariants
 * @param {string[]} images
 */
function normalizeVariants(rawVariants, images) {
  if (!Array.isArray(rawVariants)) return [];

  return rawVariants
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const variant = /** @type {Record<string, unknown>} */ (entry);
      const id = variant.id != null ? String(variant.id) : "";
      if (!id) return null;

      const price = Number(variant.price);
      const stock = readVariantStock(variant);
      const imageIndex = Number(variant.imageIndex);
      const explicitImage =
        typeof variant.image === "string" && variant.image.trim()
          ? variant.image.trim()
          : typeof variant.imageUrl === "string" && variant.imageUrl.trim()
            ? variant.imageUrl.trim()
            : "";
      const imageFromIndex =
        Number.isFinite(imageIndex) && imageIndex >= 0 && images[imageIndex]
          ? images[imageIndex]
          : "";
      const image = explicitImage || imageFromIndex || undefined;

      const optionMap = normalizeVariantOptionMap(variant);

      return {
        id,
        sku: typeof variant.sku === "string" ? variant.sku : "",
        options: optionMap,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        stock: Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0,
        ...(image ? { image } : {}),
        ...(Number.isFinite(imageIndex) && imageIndex >= 0
          ? { imageIndex: Math.floor(imageIndex) }
          : {}),
      };
    })
    .filter(Boolean);
}

/**
 * Build `{ Color: "Blue", Size: "M" }` from several common API shapes.
 * @param {Record<string, unknown>} variant
 * @returns {Record<string, string>}
 */
function normalizeVariantOptionMap(variant) {
  const direct =
    (variant.options && typeof variant.options === "object"
      ? variant.options
      : null) ||
    (variant.selectedOptions && typeof variant.selectedOptions === "object"
      ? variant.selectedOptions
      : null);

  if (direct && !Array.isArray(direct)) {
    /** @type {Record<string, string>} */
    const map = {};
    for (const [key, value] of Object.entries(direct)) {
      if (value == null || value === "") continue;
      map[String(key)] = String(value);
    }
    return map;
  }

  /** Shopify-like: `selectedOptions: [{ name, value }, …]` */
  if (Array.isArray(variant.selectedOptions)) {
    /** @type {Record<string, string>} */
    const map = {};
    for (const entry of variant.selectedOptions) {
      if (!entry || typeof entry !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (entry);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const value =
        row.value != null
          ? String(row.value).trim()
          : row.optionValue != null
            ? String(row.optionValue).trim()
            : "";
      if (name && value) map[name] = value;
    }
    return map;
  }

  return {};
}

/**
 * @param {Record<string, unknown>} variant
 * @returns {number}
 */
function readVariantStock(variant) {
  const candidates = [
    variant.stock,
    variant.inventoryQuantity,
    variant.inventory_quantity,
    variant.quantity,
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * If the API only sends variants, rebuild option groups from their maps.
 * @param {{ options: Record<string, string> }[]} variants
 * @returns {{ name: string, values: string[] }[]}
 */
function deriveOptionsFromVariants(variants) {
  /** @type {Map<string, Set<string>>} */
  const byName = new Map();

  for (const variant of variants) {
    const opts = variant?.options;
    if (!opts || typeof opts !== "object") continue;
    for (const [name, value] of Object.entries(opts)) {
      if (!name || value == null || value === "") continue;
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name)?.add(String(value));
    }
  }

  return [...byName.entries()].map(([name, values]) => ({
    name,
    values: [...values],
  }));
}

/**
 * @param {{ name: string, values: string[] }[]} options
 * @returns {string[]}
 */
function colorsFromOptions(options) {
  const colorOption = options.find(
    (option) => option.name.toLowerCase() === "color",
  );
  if (!colorOption) return [];
  return [
    ...new Set(
      colorOption.values
        .map((value) => String(value).trim().toLowerCase())
        .filter((value) => value && KNOWN_COLORS.includes(value)),
    ),
  ];
}

/**
 * Normalize an API `colors` array into lowercase filter tokens.
 * @param {unknown} rawColors
 * @returns {string[]}
 */
function normalizeColorList(rawColors) {
  if (!Array.isArray(rawColors)) return [];
  return [
    ...new Set(
      rawColors
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter((value) => value && KNOWN_COLORS.includes(value)),
    ),
  ];
}

/**
 * Map a DummyJSON products list response.
 * @param {{ products?: unknown[] }} payload
 */
function mapDummyProductsResponse(payload) {
  const list = Array.isArray(payload?.products) ? payload.products : [];
  return list.map((item) =>
    mapDummyProduct(/** @type {Record<string, unknown>} */ (item)),
  );
}

/**
 * @param {string} path
 * @param {{ signal?: AbortSignal }} [options]
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Could not load products (${response.status}).`);
  }

  return response.json();
}

/**
 * List products with DummyJSON pagination.
 * @param {{ limit?: number, skip?: number, signal?: AbortSignal }} [params]
 */
export async function fetchProducts({ limit = 12, skip = 0, signal } = {}) {
  const data = await request(
    `/products?limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}`,
    { signal },
  );

  return {
    products: mapDummyProductsResponse(data),
    total: typeof data.total === "number" ? data.total : 0,
    skip: typeof data.skip === "number" ? data.skip : skip,
    limit: typeof data.limit === "number" ? data.limit : limit,
  };
}

/**
 * Load the full DummyJSON catalog (~194 items) for client-side search/filters.
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchCatalog({ signal } = {}) {
  const data = await request(`/products?limit=250`, { signal });
  const products = mapDummyProductsResponse(data);

  return {
    products,
    total: typeof data.total === "number" ? data.total : products.length,
  };
}

/**
 * Case-insensitive partial match on title, brand, or tags.
 * Shared by listing search, suggestions, and searchProducts().
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
 * Case-insensitive partial match on product title, brand, or tags.
 * Prefer filtering an already-loaded catalog in the composable; this helper
 * remains for one-off searches that still need a network fetch.
 * @param {{ q: string, limit?: number, skip?: number, signal?: AbortSignal }} params
 */
export async function searchProducts({ q, limit = 12, skip = 0, signal } = {}) {
  const query = String(q ?? "").trim().toLowerCase();

  if (!query) {
    return fetchProducts({ limit, skip, signal });
  }

  const { products: catalog } = await fetchCatalog({ signal });
  const matched = catalog.filter((product) =>
    productMatchesSearch(product, query),
  );

  return {
    products: matched.slice(skip, skip + limit),
    total: matched.length,
    skip,
    limit,
  };
}

/**
 * Fetch a single product by id.
 * @param {number|string} id
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchProductById(id, { signal } = {}) {
  const data = await request(`/products/${encodeURIComponent(id)}`, { signal });
  return mapDummyProduct(data);
}
