/**
 * useCart — shared cart state for the whole app.
 *
 * Vue idea: refs declared at module scope are shared by every caller
 * (same pattern as useToast). Listing, cart page, and the header all
 * see the same bag — switching routes does not reset it.
 *
 * We store a product snapshot + quantity so the cart page can render
 * without re-fetching the catalog. localStorage keeps the cart after refresh
 * (product-listing requirements §7 — Persistent cart).
 *
 * Variants: when a product has size/color choices, each selected variant is
 * its own cart line (keyed by variant id). Quick-view / details should pass
 * the chosen variant; if none is passed, the first in-stock variant is used.
 */
import { ref, computed } from "vue";
import {
  cartLineKey,
  productHasVariants,
  resolveVariantForAdd,
} from "@/utils/variants.js";

const STORAGE_KEY = "mercantile-cart";

/**
 * @typedef {object} CartLine
 * @property {Record<string, unknown>} product
 * @property {number} quantity
 */

/** @type {import('vue').Ref<Record<string, CartLine>>} */
const items = ref(loadCart());

function loadCart() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    /** @type {Record<string, CartLine>} */
    const next = {};
    for (const [key, value] of Object.entries(parsed)) {
      const product = value?.product;
      const quantity = Number(value?.quantity);
      if (!product || typeof product !== "object") continue;
      if (!Number.isFinite(quantity) || quantity < 1) continue;
      next[key] = {
        product,
        quantity: Math.floor(quantity),
      };
    }
    return next;
  } catch {
    return {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
  } catch {
    /* Quota / private mode — cart still works for this session. */
  }
}

/**
 * Build the snapshot stored on a cart line (variant fields override parent).
 * @param {Record<string, unknown>} product
 * @param {Record<string, unknown> | null} variant
 */
function buildLineProduct(product, variant) {
  const stock = variant
    ? Number(variant.stock)
    : Number(product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;

  const {
    variants: _variants,
    options: _options,
    reviews: _reviews,
    ...rest
  } = product;

  return {
    ...rest,
    price: variant?.price ?? product.price,
    stock: max,
    image: variant?.image ?? product.image,
    sku: (variant?.sku || product.sku || ""),
    variantId: variant?.id ?? null,
    selectedOptions:
      variant?.options && typeof variant.options === "object"
        ? { ...variant.options }
        : null,
  };
}

/** Total units in the cart (sum of quantities). */
const cartCount = computed(() =>
  Object.values(items.value).reduce((sum, line) => sum + line.quantity, 0),
);

/** Cart lines as an array (stable order by product id, then line key). */
const cartLines = computed(() =>
  Object.entries(items.value)
    .map(([key, line]) => ({ key, ...line }))
    .sort((a, b) => {
      const byProduct = Number(a.product.id) - Number(b.product.id);
      if (byProduct !== 0) return byProduct;
      return String(a.key).localeCompare(String(b.key));
    }),
);

/** Sum of price × quantity for every line. */
const cartSubtotal = computed(() =>
  cartLines.value.reduce((sum, line) => {
    const price = Number(line.product.price);
    const safePrice = Number.isFinite(price) ? price : 0;
    return sum + safePrice * line.quantity;
  }, 0),
);

/**
 * Quantity for one cart line key (variant id or product id).
 * @param {number|string} lineKey
 * @returns {number}
 */
function getQuantity(lineKey) {
  return items.value[lineKey]?.quantity ?? 0;
}

/**
 * @param {number|string} lineKey
 * @returns {boolean}
 */
function isInCart(lineKey) {
  return getQuantity(lineKey) > 0;
}

/**
 * First add sets quantity (default 1). Listing cards then show “Go to cart”
 * instead of bumping qty. Details can pass a dropdown/custom qty + variant;
 * cart page still owns later +/- updates.
 *
 * @param {Record<string, unknown>} product
 * @param {number} [quantity]
 * @param {Record<string, unknown> | null} [variant]
 * @returns {boolean} true when the line was newly added
 */
function addToCart(product, quantity = 1, variant = null) {
  if (!product || product.id == null) return false;

  let resolved = null;
  if (productHasVariants(product)) {
    resolved = resolveVariantForAdd(product, variant);
    if (!resolved || (Number(resolved.stock) || 0) <= 0) return false;
  } else if ((product.stock ?? 0) <= 0) {
    return false;
  }

  const key = cartLineKey(product, resolved);
  if (!key || items.value[key]) return false;

  const lineProduct = buildLineProduct(product, resolved);
  if ((lineProduct.stock ?? 0) <= 0) return false;

  const max = lineProduct.stock;
  const qty = Math.min(max, Math.max(1, Math.floor(Number(quantity) || 1)));

  items.value = {
    ...items.value,
    [key]: { product: lineProduct, quantity: qty },
  };
  persist();
  return true;
}

/**
 * Buy now: ensure the item is in the cart (qty 1 if new).
 * Caller navigates to the cart route.
 *
 * @param {Record<string, unknown>} product
 * @param {Record<string, unknown> | null} [variant]
 * @returns {boolean} true when the product can proceed to cart
 */
function buyNow(product, variant = null) {
  if (!product) return false;

  let resolved = null;
  if (productHasVariants(product)) {
    resolved = resolveVariantForAdd(product, variant);
    if (!resolved || (Number(resolved.stock) || 0) <= 0) return false;
  } else if ((product.stock ?? 0) <= 0) {
    return false;
  }

  const key = cartLineKey(product, resolved);
  if (!isInCart(key)) {
    return addToCart(product, 1, resolved);
  }
  return true;
}

/**
 * @param {number|string} lineKey
 * @param {number} quantity
 */
function setQuantity(lineKey, quantity) {
  const line = items.value[lineKey];
  if (!line) return;

  const stock = Number(line.product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? stock : 1;
  const next = Math.min(max, Math.max(0, Math.floor(Number(quantity) || 0)));

  if (next < 1) {
    removeFromCart(lineKey);
    return;
  }

  items.value = {
    ...items.value,
    [lineKey]: { ...line, quantity: next },
  };
  persist();
}

/** @param {number|string} lineKey */
function increment(lineKey) {
  const line = items.value[lineKey];
  if (!line) return;
  setQuantity(lineKey, line.quantity + 1);
}

/** @param {number|string} lineKey */
function decrement(lineKey) {
  const line = items.value[lineKey];
  if (!line) return;
  setQuantity(lineKey, line.quantity - 1);
}

/** @param {number|string} lineKey */
function removeFromCart(lineKey) {
  if (!items.value[lineKey]) return;
  const next = { ...items.value };
  delete next[lineKey];
  items.value = next;
  persist();
}

function clearCart() {
  items.value = {};
  persist();
}

/**
 * Shape ProductList / ProductCard expect: `{ [productId]: quantity }`.
 * Sums quantities across every variant line of the same product so cards
 * still show “Go to cart” after any variant was added.
 */
const cartQuantities = computed(() => {
  /** @type {Record<string, number>} */
  const map = {};
  for (const line of Object.values(items.value)) {
    const productId = String(line.product.id);
    map[productId] = (map[productId] ?? 0) + line.quantity;
  }
  return map;
});

export function useCart() {
  return {
    items,
    cartLines,
    cartCount,
    cartSubtotal,
    cartQuantities,
    getQuantity,
    isInCart,
    addToCart,
    buyNow,
    setQuantity,
    increment,
    decrement,
    removeFromCart,
    clearCart,
  };
}
