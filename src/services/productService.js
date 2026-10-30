/**
 * productService — talks to DummyJSON, maps responses into our product shape,
 * and returns data ready for Vue components.
 *
 * Keeping fetch + mapping here (not in components) makes the API easy to swap
 * later and keeps Vue components focused on UI + state.
 *
 * Docs: https://dummyjson.com/docs/products
 */

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

  return Number((current / (1 - discount / 100)).toFixed(2));
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
  const discountPercentage = Number(raw.discountPercentage);
  const safeDiscount =
    Number.isFinite(discountPercentage) && discountPercentage > 0
      ? discountPercentage
      : 0;

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
  const stock = Number(raw.stock);
  const reviews = Array.isArray(raw.reviews) ? raw.reviews : [];
  const rating = typeof raw.rating === "number" ? raw.rating : null;
  const category = typeof raw.category === "string" ? raw.category : "";

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
    originalPrice: originalPriceFromDiscount(safePrice, safeDiscount),
    discountPercentage: safeDiscount,
    rating,
    reviewCount: reviews.length > 0 ? reviews.length : null,
    stock: Number.isFinite(stock) && stock > 0 ? stock : 0,
    images: images.length > 0 ? images : [PRODUCT_IMAGE_FALLBACK],
    /** Primary image for cards. */
    image,
    colors: extractColors(title, description),
    isFeatured: false,
  };
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
 * Case-insensitive partial match on product title or brand.
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
  const matched = catalog.filter((product) => {
    const title = String(product.title ?? "").toLowerCase();
    const brand = String(product.brand ?? "").toLowerCase();
    return title.includes(query) || brand.includes(query);
  });

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
