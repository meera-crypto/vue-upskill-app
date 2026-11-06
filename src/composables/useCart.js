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
 */
import { ref, computed } from "vue";

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

/** Total units in the cart (sum of quantities). */
const cartCount = computed(() =>
  Object.values(items.value).reduce((sum, line) => sum + line.quantity, 0),
);

/** Cart lines as an array (stable order by product id). */
const cartLines = computed(() =>
  Object.values(items.value).sort(
    (a, b) => Number(a.product.id) - Number(b.product.id),
  ),
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
 * @param {number|string} productId
 * @returns {number}
 */
function getQuantity(productId) {
  return items.value[productId]?.quantity ?? 0;
}

/**
 * @param {number|string} productId
 * @returns {boolean}
 */
function isInCart(productId) {
  return getQuantity(productId) > 0;
}

/**
 * First add sets quantity (default 1). Listing cards then show “Go to cart”
 * instead of bumping qty. Details can pass a dropdown/custom qty;
 * cart page still owns later +/- updates.
 *
 * @param {Record<string, unknown>} product
 * @param {number} [quantity]
 * @returns {boolean} true when the product was newly added
 */
function addToCart(product, quantity = 1) {
  if (!product || (product.stock ?? 0) <= 0) return false;

  const id = product.id;
  if (id == null) return false;

  if (items.value[id]) return false;

  const stock = Number(product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? stock : 1;
  const qty = Math.min(max, Math.max(1, Math.floor(Number(quantity) || 1)));

  items.value = {
    ...items.value,
    [id]: { product: { ...product }, quantity: qty },
  };
  persist();
  return true;
}

/**
 * Buy now: ensure the item is in the cart (qty 1 if new).
 * Caller navigates to the cart route.
 *
 * @param {Record<string, unknown>} product
 * @returns {boolean} true when the product can proceed to cart
 */
function buyNow(product) {
  if (!product || (product.stock ?? 0) <= 0) return false;
  if (!isInCart(product.id)) {
    return addToCart(product);
  }
  return true;
}

/**
 * @param {number|string} productId
 * @param {number} quantity
 */
function setQuantity(productId, quantity) {
  const line = items.value[productId];
  if (!line) return;

  const stock = Number(line.product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? stock : 1;
  const next = Math.min(max, Math.max(0, Math.floor(Number(quantity) || 0)));

  if (next < 1) {
    removeFromCart(productId);
    return;
  }

  items.value = {
    ...items.value,
    [productId]: { ...line, quantity: next },
  };
  persist();
}

/** @param {number|string} productId */
function increment(productId) {
  const line = items.value[productId];
  if (!line) return;
  setQuantity(productId, line.quantity + 1);
}

/** @param {number|string} productId */
function decrement(productId) {
  const line = items.value[productId];
  if (!line) return;
  setQuantity(productId, line.quantity - 1);
}

/** @param {number|string} productId */
function removeFromCart(productId) {
  if (!items.value[productId]) return;
  const next = { ...items.value };
  delete next[productId];
  items.value = next;
  persist();
}

function clearCart() {
  items.value = {};
  persist();
}

/**
 * Shape ProductList / ProductCard expect: `{ [productId]: quantity }`.
 */
const cartQuantities = computed(() => {
  /** @type {Record<string, number>} */
  const map = {};
  for (const [id, line] of Object.entries(items.value)) {
    map[id] = line.quantity;
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
