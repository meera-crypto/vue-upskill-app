/**
 * Listing context — shared key for provide/inject between the listing page
 * and ProductGrid / FilterSidebar children.
 *
 * Vue idea: instead of piping ~20 props and ~20 emits through ProductGrid,
 * the page `provide`s one reactive bag and descendants `inject` what they need.
 *
 * TypeScript idea: `InjectionKey<ListingContext>` ties the key to the shape of
 * the bag, so `inject(LISTING_CONTEXT_KEY)` is typed (no casts at call sites).
 */
import type { InjectionKey } from "vue";
import type { Product, ProductVariant } from "@/types/product";
import type {
  ActiveFilterChip,
  PriceBounds,
  ProductFilters,
} from "@/composables/useProductFilters";
import type { buildFilterOptions } from "@/utils/filterOptions";

/**
 * What the listing page provides. It is passed through `reactive()`, so refs
 * are already unwrapped here (e.g. `cart` is a plain object, not a Ref).
 */
export interface ListingContext {
  // — state —
  filters: ProductFilters;
  filterOptions: ReturnType<typeof buildFilterOptions>;
  priceBounds: PriceBounds;
  activeChips: ActiveFilterChip[];
  hasActiveFilters: boolean;
  /** Cart quantity per product id. */
  cart: Record<string, number>;
  /** Favorited product ids. */
  favorites: (number | string)[];

  // — filter actions —
  toggleBrand: (value: string) => void;
  toggleColor: (value: string) => void;
  toggleSize: (value: string) => void;
  toggleRating: (value: number) => void;
  toggleDiscount: (value: number) => void;
  toggleInStock: () => void;
  setSort: (value: string) => void;
  setPriceRange: (min: number | string, max: number | string) => void;
  removeChip: (chip: ActiveFilterChip | null | undefined) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  retry: () => void | Promise<void>;

  // — product actions —
  addToCart: (product: Product, variant?: ProductVariant | null) => void;
  goToCart: () => void;
  toggleFavorite: (product: Product) => void;
  seeAllOptions: (product: Product) => void;

  // — pagination —
  prevPage: () => void;
  nextPage: () => void;
  goToPage: (page: number | string) => void;
  loadMore: () => void;
}

export const LISTING_CONTEXT_KEY: InjectionKey<ListingContext> =
  Symbol("listingContext");
