/**
 * Listing context — shared key for provide/inject between the listing page
 * and ProductGrid / FilterSidebar children.
 *
 * Vue idea: instead of piping ~20 props and ~20 emits through ProductGrid,
 * the page `provide`s one reactive bag and descendants `inject` what they need.
 */
export const LISTING_CONTEXT_KEY = Symbol("listingContext");
