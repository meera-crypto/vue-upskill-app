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
import type {
  CartLine,
  CartLineProduct,
  Product,
  ProductVariant,
} from "@/types/product";
import {
  cartLineKey,
  productHasVariants,
  resolveVariantForAdd,
} from "@/utils/variants";

const STORAGE_KEY = "mercantile-cart";

const items = ref<Record<string, CartLine>>(loadCart());

function loadCart(): Record<string, CartLine> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const next: Record<string, CartLine> = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, { product?: CartLineProduct; quantity?: number }>,
    )) {
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

/** Build the snapshot stored on a cart line (variant fields override parent). */
function buildLineProduct(
  product: Product,
  variant: ProductVariant | null,
): CartLineProduct {
  const stock = variant ? Number(variant.stock) : Number(product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;

  const {
    variants: _variants,
    options: _options,
    reviews: _reviews,
    ...rest
  } = product;

  /*
   * The snapshot intentionally omits variants / options / reviews (kept small
   * for localStorage), so it is cast to CartLineProduct at this boundary.
   */
  return {
    ...rest,
    price: variant?.price ?? product.price,
    stock: max,
    image: variant?.image ?? product.image,
    sku: variant?.sku || product.sku || "",
    variantId: variant?.id ?? null,
    selectedOptions:
      variant?.options && typeof variant.options === "object"
        ? { ...variant.options }
        : null,
  } as unknown as CartLineProduct;
}

const cartCount = computed(() =>
  Object.values(items.value).reduce((sum, line) => sum + line.quantity, 0),
);

const cartLines = computed(() =>
  Object.entries(items.value)
    .map(([key, line]) => ({ key, ...line }))
    .sort((a, b) => {
      const byProduct = Number(a.product.id) - Number(b.product.id);
      if (byProduct !== 0) return byProduct;
      return String(a.key).localeCompare(String(b.key));
    }),
);

const cartSubtotal = computed(() =>
  cartLines.value.reduce((sum, line) => {
    const price = Number(line.product.price);
    const safePrice = Number.isFinite(price) ? price : 0;
    return sum + safePrice * line.quantity;
  }, 0),
);

function getQuantity(lineKey: string | number): number {
  return items.value[String(lineKey)]?.quantity ?? 0;
}

function isInCart(lineKey: string | number): boolean {
  return getQuantity(lineKey) > 0;
}

function addToCart(
  product: Product,
  quantity = 1,
  variant: ProductVariant | null = null,
): boolean {
  if (!product || product.id == null) return false;

  let resolved: ProductVariant | null = null;
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

function buyNow(
  product: Product,
  variant: ProductVariant | null = null,
): boolean {
  if (!product) return false;

  let resolved: ProductVariant | null = null;
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

function setQuantity(lineKey: string | number, quantity: number) {
  const key = String(lineKey);
  const line = items.value[key];
  if (!line) return;

  const stock = Number(line.product.stock);
  const max = Number.isFinite(stock) && stock > 0 ? stock : 1;
  const next = Math.min(max, Math.max(0, Math.floor(Number(quantity) || 0)));

  if (next < 1) {
    removeFromCart(key);
    return;
  }

  items.value = {
    ...items.value,
    [key]: { ...line, quantity: next },
  };
  persist();
}

function increment(lineKey: string | number) {
  const line = items.value[String(lineKey)];
  if (!line) return;
  setQuantity(lineKey, line.quantity + 1);
}

function decrement(lineKey: string | number) {
  const line = items.value[String(lineKey)];
  if (!line) return;
  setQuantity(lineKey, line.quantity - 1);
}

function removeFromCart(lineKey: string | number) {
  const key = String(lineKey);
  if (!items.value[key]) return;
  const next = { ...items.value };
  delete next[key];
  items.value = next;
  persist();
}

function clearCart() {
  items.value = {};
  persist();
}

const cartQuantities = computed(() => {
  const map: Record<string, number> = {};
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
