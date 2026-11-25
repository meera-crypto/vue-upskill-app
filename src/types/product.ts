/**
 * Shared product / variant types used across services, composables, and UI.
 * Keep these as the single source of truth — avoid re-declaring the same shape.
 */

/** One selectable option group (e.g. Color → Blue, Black). */
export interface ProductOption {
  name: string;
  values: string[];
}

/** One purchasable SKU combination. */
export interface ProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  image?: string;
  imageIndex?: number;
}

export interface ProductReview {
  rating: number | null;
  comment: string;
  date: string;
  reviewerName: string;
}

/**
 * Normalized storefront product (after `mapDummyProduct`).
 * Listing cards, PDP, cart, and filters all consume this shape.
 */
export interface Product {
  id: number | string;
  title: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  categoryLabel: string;
  description: string;
  price: number;
  originalPrice: number | null;
  discountPercentage: number;
  rating: number | null;
  reviewCount: number | null;
  salesCount: number;
  createdAt: string | null;
  stock: number;
  images: string[];
  image: string;
  thumbnail: string;
  colors: string[];
  sizes: string[];
  options: ProductOption[];
  variants: ProductVariant[];
  isFeatured: boolean;
  reviews: ProductReview[];
  tags: string[];
  sku: string;
  warrantyInformation: string;
  shippingInformation: string;
  returnPolicy: string;
  availabilityStatus: string;
}

/** Loose DummyJSON payload before mapping. */
export type RawProduct = Record<string, unknown>;

export interface VariantOverlay {
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface ProductSortMeta {
  salesCount?: number;
  isFeatured?: boolean;
}

export interface CartLineProduct extends Product {
  /** Present when the line is a specific variant. */
  variantId?: string;
  selectedOptions?: Record<string, string>;
  lineKey?: string;
}

export interface CartLine {
  product: CartLineProduct;
  quantity: number;
}
