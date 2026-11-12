/**
 * Local variant overlays for selected DummyJSON products.
 *
 * Used only as a fallback when the API product has no `variants` array.
 * If the API later ships real options/variants, `productService` prefers those
 * and ignores the matching overlay for that product.
 *
 * Keys are DummyJSON product ids.
 */

/**
 * @typedef {{ name: string, values: string[] }} ProductOption
 * @typedef {{
 *   id: string,
 *   sku: string,
 *   options: Record<string, string>,
 *   price: number,
 *   stock: number,
 *   imageIndex?: number,
 * }} ProductVariant
 * @typedef {{ options: ProductOption[], variants: ProductVariant[] }} VariantOverlay
 */

/** @type {Record<number, VariantOverlay>} */
export const PRODUCT_VARIANT_OVERLAYS = {
  /** Mens check shirt — color + size matrix (one combo OOS). */
  83: {
    options: [
      { name: "Color", values: ["Blue", "Black"] },
      { name: "Size", values: ["S", "M", "L", "XL"] },
    ],
    variants: [
      {
        id: "83-blue-s",
        sku: "CHK-BLU-S",
        options: { Color: "Blue", Size: "S" },
        price: 29.99,
        stock: 6,
        imageIndex: 0,
      },
      {
        id: "83-blue-m",
        sku: "CHK-BLU-M",
        options: { Color: "Blue", Size: "M" },
        price: 29.99,
        stock: 10,
        imageIndex: 1,
      },
      {
        id: "83-blue-l",
        sku: "CHK-BLU-L",
        options: { Color: "Blue", Size: "L" },
        price: 29.99,
        stock: 8,
        imageIndex: 2,
      },
      {
        id: "83-blue-xl",
        sku: "CHK-BLU-XL",
        options: { Color: "Blue", Size: "XL" },
        price: 29.99,
        stock: 4,
        imageIndex: 3,
      },
      {
        id: "83-black-s",
        sku: "CHK-BLK-S",
        options: { Color: "Black", Size: "S" },
        price: 29.99,
        stock: 3,
        imageIndex: 0,
      },
      {
        id: "83-black-m",
        sku: "CHK-BLK-M",
        options: { Color: "Black", Size: "M" },
        price: 29.99,
        stock: 7,
        imageIndex: 1,
      },
      {
        id: "83-black-l",
        sku: "CHK-BLK-L",
        options: { Color: "Black", Size: "L" },
        price: 29.99,
        stock: 0,
        imageIndex: 2,
      },
      {
        id: "83-black-xl",
        sku: "CHK-BLK-XL",
        options: { Color: "Black", Size: "XL" },
        price: 31.99,
        stock: 2,
        imageIndex: 3,
      },
    ],
  },

  /** Short sleeve shirt — size only, low overall stock. */
  86: {
    options: [{ name: "Size", values: ["S", "M", "L"] }],
    variants: [
      {
        id: "86-s",
        sku: "MSS-S",
        options: { Size: "S" },
        price: 19.99,
        stock: 0,
      },
      {
        id: "86-m",
        sku: "MSS-M",
        options: { Size: "M" },
        price: 19.99,
        stock: 1,
      },
      {
        id: "86-l",
        sku: "MSS-L",
        options: { Size: "L" },
        price: 19.99,
        stock: 1,
      },
    ],
  },

  /** Women's gown — size only. */
  177: {
    options: [{ name: "Size", values: ["XS", "S", "M", "L"] }],
    variants: [
      {
        id: "177-xs",
        sku: "GWN-XS",
        options: { Size: "XS" },
        price: 129.99,
        stock: 4,
        imageIndex: 0,
      },
      {
        id: "177-s",
        sku: "GWN-S",
        options: { Size: "S" },
        price: 129.99,
        stock: 8,
        imageIndex: 1,
      },
      {
        id: "177-m",
        sku: "GWN-M",
        options: { Size: "M" },
        price: 129.99,
        stock: 9,
        imageIndex: 2,
      },
      {
        id: "177-l",
        sku: "GWN-L",
        options: { Size: "L" },
        price: 129.99,
        stock: 4,
        imageIndex: 3,
      },
    ],
  },

  /** Air Jordan — shoe sizes; one size sold out. */
  88: {
    options: [{ name: "Size", values: ["8", "9", "10", "11"] }],
    variants: [
      {
        id: "88-8",
        sku: "AJ1-8",
        options: { Size: "8" },
        price: 149.99,
        stock: 2,
        imageIndex: 0,
      },
      {
        id: "88-9",
        sku: "AJ1-9",
        options: { Size: "9" },
        price: 149.99,
        stock: 0,
        imageIndex: 1,
      },
      {
        id: "88-10",
        sku: "AJ1-10",
        options: { Size: "10" },
        price: 149.99,
        stock: 3,
        imageIndex: 2,
      },
      {
        id: "88-11",
        sku: "AJ1-11",
        options: { Size: "11" },
        price: 149.99,
        stock: 2,
        imageIndex: 3,
      },
    ],
  },

  /** iPhone 13 Pro — color + storage. */
  123: {
    options: [
      { name: "Color", values: ["Silver", "Gold", "Blue"] },
      { name: "Storage", values: ["128GB", "256GB", "512GB"] },
    ],
    variants: [
      {
        id: "123-silver-128",
        sku: "IP13P-SLV-128",
        options: { Color: "Silver", Storage: "128GB" },
        price: 999.99,
        stock: 8,
        imageIndex: 0,
      },
      {
        id: "123-silver-256",
        sku: "IP13P-SLV-256",
        options: { Color: "Silver", Storage: "256GB" },
        price: 1099.99,
        stock: 6,
        imageIndex: 0,
      },
      {
        id: "123-silver-512",
        sku: "IP13P-SLV-512",
        options: { Color: "Silver", Storage: "512GB" },
        price: 1299.99,
        stock: 2,
        imageIndex: 0,
      },
      {
        id: "123-gold-128",
        sku: "IP13P-GLD-128",
        options: { Color: "Gold", Storage: "128GB" },
        price: 999.99,
        stock: 5,
        imageIndex: 1,
      },
      {
        id: "123-gold-256",
        sku: "IP13P-GLD-256",
        options: { Color: "Gold", Storage: "256GB" },
        price: 1099.99,
        stock: 7,
        imageIndex: 1,
      },
      {
        id: "123-gold-512",
        sku: "IP13P-GLD-512",
        options: { Color: "Gold", Storage: "512GB" },
        price: 1299.99,
        stock: 0,
        imageIndex: 1,
      },
      {
        id: "123-blue-128",
        sku: "IP13P-BLU-128",
        options: { Color: "Blue", Storage: "128GB" },
        price: 999.99,
        stock: 9,
        imageIndex: 2,
      },
      {
        id: "123-blue-256",
        sku: "IP13P-BLU-256",
        options: { Color: "Blue", Storage: "256GB" },
        price: 1099.99,
        stock: 11,
        imageIndex: 2,
      },
      {
        id: "123-blue-512",
        sku: "IP13P-BLU-512",
        options: { Color: "Blue", Storage: "512GB" },
        price: 1299.99,
        stock: 3,
        imageIndex: 2,
      },
    ],
  },

  /** MacBook — finish only. */
  78: {
    options: [{ name: "Color", values: ["Space Grey", "Silver"] }],
    variants: [
      {
        id: "78-space-grey",
        sku: "MBP14-SG",
        options: { Color: "Space Grey" },
        price: 1999.99,
        stock: 12,
        imageIndex: 0,
      },
      {
        id: "78-silver",
        sku: "MBP14-SLV",
        options: { Color: "Silver" },
        price: 1999.99,
        stock: 12,
        imageIndex: 1,
      },
    ],
  },

  /** Fragrance — bottle size. */
  6: {
    options: [{ name: "Size", values: ["50ml", "100ml", "200ml"] }],
    variants: [
      {
        id: "6-50",
        sku: "CKONE-50",
        options: { Size: "50ml" },
        price: 39.99,
        stock: 10,
        imageIndex: 0,
      },
      {
        id: "6-100",
        sku: "CKONE-100",
        options: { Size: "100ml" },
        price: 49.99,
        stock: 14,
        imageIndex: 1,
      },
      {
        id: "6-200",
        sku: "CKONE-200",
        options: { Size: "200ml" },
        price: 69.99,
        stock: 5,
        imageIndex: 2,
      },
    ],
  },

  /** Lipstick — color shades only. */
  4: {
    options: [
      { name: "Color", values: ["Red", "Pink", "Brown", "Nude"] },
    ],
    variants: [
      {
        id: "4-red",
        sku: "LIP-RED",
        options: { Color: "Red" },
        price: 12.99,
        stock: 20,
      },
      {
        id: "4-pink",
        sku: "LIP-PNK",
        options: { Color: "Pink" },
        price: 12.99,
        stock: 18,
      },
      {
        id: "4-brown",
        sku: "LIP-BRN",
        options: { Color: "Brown" },
        price: 12.99,
        stock: 15,
      },
      {
        id: "4-nude",
        sku: "LIP-NUD",
        options: { Color: "Nude" },
        price: 12.99,
        stock: 0,
      },
    ],
  },

  /** Ice cream — flavor (treated as Color for swatches where known). */
  28: {
    options: [
      { name: "Flavor", values: ["Vanilla", "Chocolate", "Strawberry"] },
      { name: "Size", values: ["Pint", "Quart"] },
    ],
    variants: [
      {
        id: "28-van-pint",
        sku: "ICE-VAN-PT",
        options: { Flavor: "Vanilla", Size: "Pint" },
        price: 4.99,
        stock: 10,
        imageIndex: 0,
      },
      {
        id: "28-van-quart",
        sku: "ICE-VAN-QT",
        options: { Flavor: "Vanilla", Size: "Quart" },
        price: 7.99,
        stock: 6,
        imageIndex: 0,
      },
      {
        id: "28-choc-pint",
        sku: "ICE-CHC-PT",
        options: { Flavor: "Chocolate", Size: "Pint" },
        price: 4.99,
        stock: 8,
        imageIndex: 1,
      },
      {
        id: "28-choc-quart",
        sku: "ICE-CHC-QT",
        options: { Flavor: "Chocolate", Size: "Quart" },
        price: 7.99,
        stock: 0,
        imageIndex: 1,
      },
      {
        id: "28-str-pint",
        sku: "ICE-STR-PT",
        options: { Flavor: "Strawberry", Size: "Pint" },
        price: 4.99,
        stock: 5,
        imageIndex: 2,
      },
      {
        id: "28-str-quart",
        sku: "ICE-STR-QT",
        options: { Flavor: "Strawberry", Size: "Quart" },
        price: 7.99,
        stock: 3,
        imageIndex: 3,
      },
    ],
  },
};
