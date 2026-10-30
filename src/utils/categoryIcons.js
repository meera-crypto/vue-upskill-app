/**
 * Map DummyJSON category slugs → Lucide icons (desktop category strip).
 */
import {
  Sparkles,
  Flower2,
  Armchair,
  ShoppingBasket,
  Lamp,
  UtensilsCrossed,
  Laptop,
  Shirt,
  Footprints,
  Watch,
  Headphones,
  Bike,
  Droplets,
  Smartphone,
  Dumbbell,
  Glasses,
  Tablet,
  Car,
  ShoppingBag,
  Gem,
  Tag,
} from "@lucide/vue";

/** @type {Record<string, import('vue').Component>} */
const CATEGORY_ICONS = {
  beauty: Sparkles,
  fragrances: Flower2,
  furniture: Armchair,
  groceries: ShoppingBasket,
  "home-decoration": Lamp,
  "kitchen-accessories": UtensilsCrossed,
  laptops: Laptop,
  "mens-shirts": Shirt,
  "mens-shoes": Footprints,
  "mens-watches": Watch,
  "mobile-accessories": Headphones,
  motorcycle: Bike,
  "skin-care": Droplets,
  smartphones: Smartphone,
  "sports-accessories": Dumbbell,
  sunglasses: Glasses,
  tablets: Tablet,
  tops: Shirt,
  vehicle: Car,
  "womens-bags": ShoppingBag,
  "womens-dresses": Shirt,
  "womens-jewellery": Gem,
  "womens-shoes": Footprints,
  "womens-watches": Watch,
};

/**
 * @param {string} slug
 * @returns {import('vue').Component}
 */
export function getCategoryIcon(slug) {
  return CATEGORY_ICONS[slug] ?? Tag;
}
