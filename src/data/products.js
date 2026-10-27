/**
 * Dummy product catalog for local development.
 * Later you can replace this with data from an API (fetch / axios).
 *
 * Each product uses a stable `id` — Vue needs that for :key on lists.
 * `stock` is how many units are available (0 = sold out).
 */
export const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 79.99,
    description: "Comfortable over-ear headphones with clear sound.",
    stock: 42,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  },
  {
    id: 2,
    name: "Smart Watch",
    price: 149.99,
    description: "Track fitness, messages, and daily habits.",
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "USB-C Hub",
    price: 39.99,
    description: "Expand your laptop with HDMI, USB, and SD slots.",
    stock: 67,
    image:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop",
  },
  {
    id: 4,
    name: "Desk Lamp",
    price: 34.5,
    description: "Adjustable LED lamp with warm and cool modes.",
    stock: 0,
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
  },
  {
    id: 5,
    name: "Mechanical Keyboard",
    price: 99.0,
    description: "Tactile switches and a compact layout for typing.",
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop",
  },
  {
    id: 6,
    name: "Portable Charger",
    price: 29.99,
    description: "10,000 mAh power bank for phones and earbuds.",
    stock: 91,
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",
  },
  {
    id: 7,
    name: "Linen Shirt",
    price: 48.0,
    description: "Breathable long-sleeve shirt for warm days.",
    stock: 33,
    image:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
  },
  {
    id: 8,
    name: "Denim Jacket",
    price: 89.99,
    description: "Classic wash jacket with a soft inner lining.",
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop",
  },
  {
    id: 9,
    name: "Everyday Hoodie",
    price: 54.5,
    description: "Soft fleece hoodie with a relaxed fit.",
    stock: 76,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop",
  },
  {
    id: 10,
    name: "Running Sneakers",
    price: 119.0,
    description: "Lightweight shoes built for daily miles.",
    stock: 7,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  },
  {
    id: 11,
    name: "Wool Beanie",
    price: 22.0,
    description: "Warm knit beanie for cold weather.",
    stock: 100,
    image:
      "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=400&fit=crop",
  },
  {
    id: 12,
    name: "Canvas Tote Bag",
    price: 27.5,
    description: "Sturdy everyday tote with an inner pocket.",
    stock: 54,
    image:
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&h=400&fit=crop",
  },
  {
    id: 13,
    name: "Ceramic Mug Set",
    price: 36.0,
    description: "Set of four matte mugs for coffee or tea.",
    stock: 41,
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop",
  },
  {
    id: 14,
    name: "Notebook Duo",
    price: 18.99,
    description: "Two dotted notebooks for notes and sketches.",
    stock: 88,
    image:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=400&fit=crop",
  },
  {
    id: 15,
    name: "Potted Succulent",
    price: 24.0,
    description: "Low-maintenance plant for desks and shelves.",
    stock: 3,
    image:
      "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop",
  },
  {
    id: 16,
    name: "Bluetooth Speaker",
    price: 64.99,
    description: "Compact speaker with rich bass outdoors.",
    stock: 59,
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
  },
  {
    id: 17,
    name: "White T-Shirt",
    price: 19.99,
    description: "Soft cotton tee for everyday wear.",
    stock: 85,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
  },
  {
    id: 18,
    name: "Chino Pants",
    price: 59.0,
    description: "Slim-fit chinos that dress up or down.",
    stock: 28,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
  },
  {
    id: 19,
    name: "Crewneck Sweater",
    price: 62.0,
    description: "Soft cotton sweater for cooler evenings.",
    stock: 46,
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
  },
  {
    id: 20,
    name: "Aviator Sunglasses",
    price: 72.5,
    description: "UV-protective lenses in a classic metal frame.",
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop",
  },
  {
    id: 21,
    name: "Winter Scarf",
    price: 28.0,
    description: "Soft wool-blend scarf for chilly mornings.",
    stock: 63,
    image:
      "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&h=400&fit=crop",
  },
  {
    id: 22,
    name: "Wireless Mouse",
    price: 32.99,
    description: "Quiet clicks and long battery life for desks.",
    stock: 71,
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
  },
  {
    id: 23,
    name: "Laptop Sleeve",
    price: 29.0,
    description: "Padded sleeve that fits most 13-inch laptops.",
    stock: 52,
    image:
      "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400&h=400&fit=crop",
  },
  {
    id: 24,
    name: "Desk Organizer",
    price: 21.5,
    description: "Keep pens, cables, and sticky notes tidy.",
    stock: 39,
    image:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop",
  },
  {
    id: 25,
    name: "Water Bottle",
    price: 26.0,
    description: "Insulated bottle that keeps drinks cold all day.",
    stock: 94,
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
  },
  {
    id: 26,
    name: "Yoga Mat",
    price: 44.99,
    description: "Non-slip mat with a carry strap included.",
    stock: 21,
    image:
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop",
  },
  {
    id: 27,
    name: "Candle Trio",
    price: 38.0,
    description: "Three soy candles with soft citrus scents.",
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop",
  },
  {
    id: 28,
    name: "Throw Blanket",
    price: 55.0,
    description: "Cozy knit throw for sofas and reading nooks.",
    stock: 16,
    image:
      "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=400&h=400&fit=crop",
  },
  {
    id: 29,
    name: "Backpack",
    price: 78.0,
    description: "Everyday pack with a padded laptop pocket.",
    stock: 34,
    image:
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop",
  },
  {
    id: 30,
    name: "Baseball Cap",
    price: 24.99,
    description: "Structured cotton cap with an adjustable strap.",
    stock: 57,
    image:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop",
  },
];
