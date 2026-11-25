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
import type { Component } from "vue";

const CATEGORY_ICONS: Record<string, Component> = {
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

export function getCategoryIcon(slug: string): Component {
  return CATEGORY_ICONS[slug] ?? Tag;
}
