/**
 * Map storefront category slugs → Lucide icons (desktop category strip).
 * Slugs match `resolveStorefrontCategory` in categoryGroups.js.
 */
import {
  Sparkles,
  Armchair,
  ShoppingBasket,
  Lamp,
  UtensilsCrossed,
  Shirt,
  Bike,
  Droplets,
  Cpu,
  Dumbbell,
  Glasses,
  Car,
  ShoppingBag,
  Tag,
} from "@lucide/vue";

/** @type {Record<string, import('vue').Component>} */
const CATEGORY_ICONS = {
  beauty: Sparkles,
  furniture: Armchair,
  groceries: ShoppingBasket,
  home: Lamp,
  kitchen: UtensilsCrossed,
  mens: Shirt,
  motorcycle: Bike,
  "skin-care": Droplets,
  gadgets: Cpu,
  sports: Dumbbell,
  sunglasses: Glasses,
  vehicle: Car,
  womens: ShoppingBag,
};

/**
 * @param {string} slug
 * @returns {import('vue').Component}
 */
export function getCategoryIcon(slug) {
  return CATEGORY_ICONS[slug] ?? Tag;
}
