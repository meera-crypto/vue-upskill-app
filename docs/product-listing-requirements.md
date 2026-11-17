# Vue 3 E-Commerce Product Listing Page

Functional Requirements, UX Guidelines & Implementation Plan

**Project scope:** Vue 3 + Composition API + Dummy API

## 1. Project Overview

Build a responsive e-commerce product listing page in Vue 3 using a dummy API. The page should support product discovery, search, filtering, sorting, pagination, basic cart and wishlist interactions, and reliable loading/error/empty states. The implementation should be component-based, accessible, testable, and easy to extend.

### Project goals

- Display product data fetched from a dummy API.
- Help users quickly discover relevant products.
- Make search, filters, sorting, and pagination work together consistently.
- Provide clear feedback for loading, errors, empty results, and shopping actions.
- Practise Vue 3 Composition API, reusable components, composables, and API service separation.

## 2. Page Structure

Recommended page sections, from top to bottom:

1. Header: logo; global search on tablet+; account/wishlist/cart entry points.
   - Mobile (&lt;768px): logo in the top bar; Favorites / Cart / Profile in a fixed bottom icon bar (no hamburger drawer).
   - Tablet+ (≥768px): search centered in the header; icons inline in the header bar.
   - Category strip is always reserved (skeleton chips while the catalog loads) so header height does not shift when categories appear.
2. Breadcrumb navigation (shared `Breadcrumbs` on details, favorites, and cart; listing and 404 have none). Favorites and cart use a single current-page crumb; product details uses a multi-step trail (Products → category → name).
3. Category title / hero banner — tablet+ only; hidden on mobile.
4. Site-wide header search (tablet+ in the header bar; mobile under the logo). Search and category combine with AND: results stay scoped to the selected category (chip kept). If the query has no matches in that category, show the empty state; do not auto-clear the category chip.
5. Product listing toolbar: result count and sorting control.
6. Filter sidebar on desktop; filter drawer or bottom sheet on mobile.
7. Active filter chips with individual remove actions and a Clear All action.
8. Responsive product grid.
9. Pagination or Load More control.
10. Optional sections: recently viewed products; product details includes Similar products (same category, ranked by brand/tags).

## 3. Functional Requirements

### 3.1 Product Cards

| Element                 | Requirement                                                                                                                                                                                                                                                           | UX guidance                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Product image           | Show primary image; use fallback if unavailable.                                                                                                                                                                                                                      | Consistent aspect ratio; avoid layout shift.                          |
| Name and brand          | Show readable name and brand where relevant.                                                                                                                                                                                                                          | Keep text hierarchy clear; link to details.                           |
| Price                   | Show current price and currency.                                                                                                                                                                                                                                      | Make price easy to scan.                                              |
| Original price/discount | Show only for valid discounts.                                                                                                                                                                                                                                        | Avoid misleading savings claims.                                      |
| Rating/reviews          | Show only when data exists.                                                                                                                                                                                                                                           | Include review count where available.                                 |
| Availability            | Indicate in-stock/out-of-stock state.                                                                                                                                                                                                                                 | Disable or replace Add to Cart when unavailable.                      |
| Wishlist                | Toggle saved state.                                                                                                                                                                                                                                                   | Use a clear label/state and accessible button name.                   |
| Add to Cart             | Add eligible item and update cart count.                                                                                                                                                                                                                              | Toast success on add; `toast.error` when add fails.                   |
| Quick View/variants     | Variant products: on desktop hover an options strip appears over the product image (same hover as image zoom; no layout shift). Users can select options there and Add to cart without opening details. Mobile shows a primary “View all” link under the description. | Validate selected variant before adding (card quick view or details). |

### 3.2 Search

- Search by product name, brand, and tags; category search can be added.
- Use case-insensitive partial matching.
- Header search shows a product suggestions dropdown while typing (title / brand / tags; matched search text highlighted); choosing a product opens details.
- Suggestions include a View all action at the bottom that applies the typed query on the listing; keyboard arrows reach every suggestion (including those below the fold) and View all.
- Provide a clear-search action and display the result count.
- Debounce API-backed search by approximately 250–350 ms.
- Header search works with category as AND filters: keep the selected category (and its URL/`category` chip) while searching. Results are scoped to that category. If the query has no matches inside it (including when matches exist only in other categories), show the empty state and leave the chip selected so the user can clear search, clear the category, or pick another. Keep other filters (brand, price, rating, stock, color, discount) and sort.
- Keep other current filters and sort when the search changes.
- Show a useful no-results state and allow users to clear the query.
- Prevent stale responses from replacing newer results; use AbortController for obsolete requests.

### 3.3 Filters

| Filter                | Suggested control                                                    | Example                                                   |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| Category              | Horizontal strip under header search (not in sidebar); single-select | Beauty, Laptops — text on mobile; icon + text on desktop  |
| Price                 | Dual range slider + min/max number inputs                            | $10–$100; typed values clamp and stay in sync with thumbs |
| Brand                 | Checkboxes (scoped to selected category when one is active)          | SoundMax, AudioPro                                        |
| Rating                | Radio/checkbox options                                               | 4 stars and above                                         |
| Availability          | Checkbox                                                             | In stock                                                  |
| Color / Size          | Swatches / buttons                                                   | Black, White / S, M, L                                    |
| Discount / Attributes | Checkboxes or dynamic controls                                       | On sale, connectivity                                     |

- Support multiple selected values within a filter group.
- Use OR logic within the same group where appropriate (e.g., Brand A OR Brand B).
- Use AND logic across different groups (e.g., brand AND price AND in-stock).
- Brand options depend on category: with a category selected, show only brands that appear in that category; with no category, show all brands. Drop brand selections that fall outside the updated option list when the category changes. If the scoped brand list is empty, show “No brands found” in the Brand filter panel.
- Color filter accordion is always mounted (like Brand). While color options are empty (e.g. catalog still loading), show “No colors found” in the panel instead of hiding the whole Color section (avoids layout shift when swatches arrive).
- Show active filter chips and allow each one to be removed independently.
- Provide Clear All and preserve unrelated filters when one filter changes.
- Update the result count and handle zero-result combinations.
- On mobile, allow users to apply multiple choices before closing the filter drawer.

### 3.4 Sorting

| Option             | Expected behavior                                            |
| ------------------ | ------------------------------------------------------------ |
| Featured           | Use a defined featured-first order and predictable fallback. |
| Price: Low to High | Sort by ascending current price.                             |
| Price: High to Low | Sort by descending current price.                            |
| Newest             | Sort by publication/creation date where available.           |
| Customer Rating    | Sort by rating; define behavior for unrated products.        |
| Best Selling       | Use sales count if available.                                |
| Biggest Discount   | Sort by discount percentage, not raw savings amount.         |

Sorting must not clear filters or search. Changing filters/search should reset pagination to a valid first page.

### 3.5 Pagination

- Start with 12 products per page (or batch).
- **Tablet / desktop (md+):** numbered pagination — show current page, total pages, and result range; disable Previous on the first page and Next on the last page.
- **Mobile (below md):** Load more control — show the first 12 products, then reveal 12 more on each tap; toolbar shows the cumulative range (e.g. Showing 1–24 of 194). Hide Load more when all matches are visible.
- Preserve search, filters, and sort while navigating pages or loading more.
- Reset to page 1 (and reset the mobile visible batch to 12) after a search/filter change.
- Handle pages that become invalid after the result set changes.
- For client-side processing, use this order: **Search → Filter → Sort → Paginate**. With server-side processing, the API should apply equivalent logic and return page metadata.

## 4. Dummy API and Data Contract

Recommended starting point: [DummyJSON Products API](https://dummyjson.com/docs/products). It provides sample products and supports basic listing, search, and pagination. Its response and capabilities may not match every custom field or filter needed; map the data or supplement it with local mock data.

**Variants:** `productService` normalizes `options` + `variants` from the API when present (including common aliases like `selectedOptions`, `inventoryQuantity`). If the API product has no variants, selected DummyJSON ids fall back to a local overlay from `src/data/productVariants.js`. Product-level `stock` becomes the sum of variant stocks; listing color filters prefer an API `colors` array, then Color option values, then title/description extraction.

### Example endpoints

- `GET https://dummyjson.com/products?limit=12&skip=0`
- `GET https://dummyjson.com/products/search?q=phone&limit=12`
- `GET https://dummyjson.com/products/101`

### Suggested product model

```json
{
  "id": 101,
  "title": "Wireless Headphones Pro",
  "slug": "wireless-headphones-pro",
  "brand": "SoundMax",
  "category": "Electronics",
  "price": 79.99,
  "originalPrice": 99.99,
  "rating": 4.5,
  "reviewCount": 128,
  "stock": 15,
  "images": ["/images/headphones-black.webp"],
  "colors": ["black", "white", "blue"],
  "options": [
    { "name": "Color", "values": ["Black", "White", "Blue"] },
    { "name": "Size", "values": ["S", "M", "L"] }
  ],
  "variants": [
    {
      "id": "101-black-m",
      "sku": "HP-BLK-M",
      "options": { "Color": "Black", "Size": "M" },
      "price": 79.99,
      "stock": 4
    }
  ],
  "isFeatured": true
}
```

### API states to cover

- **Loading:** listing uses `ProductSkeleton` (12 placeholder cards); filter sidebar stays mounted and uses CSS min-heights so it does not jump when the catalog arrives; details uses an inline page skeleton plus “Loading product…”.
- **Success:** render returned products.
- **Empty:** shared `EmptyState` with a clear message and reset actions (clear filters/search, try again, or browse).
- **Error:** shared `EmptyState` (`variant="error"`) with a useful message and Retry / Try again.
- **Missing/partial data:** use safe fallbacks for optional fields and images.
- **Slow or duplicate requests:** avoid unnecessary requests and indefinite loading.
- **Stale response:** cancel or ignore obsolete requests.

Cart and wishlist endpoints in this project can be simulated locally. In a production store, the backend must validate stock, price, availability, and variants.

## 5. Vue 3 Component Architecture

Components are grouped by role under `src/components/`. Cart and wishlist state live in composables (Pinia `stores/` is optional and not required yet).

- [x] components/layout: `AppHeader.vue`, `AppFooter.vue`, `Breadcrumbs.vue`, `Hero.vue`, `ToastContainer.vue`.
- [x] components/product: `ProductCard.vue`, `ProductGrid.vue`, `ProductPrice.vue`, `ProductRating.vue`, `QuickViewModal.vue`, `ProductCarousel.vue`, `RecentlyViewedProducts.vue`, `ProductCompare.vue`.
- [x] components/listing: `ProductSearch.vue`, `FilterSidebar.vue`, `FilterGroup.vue`, `ActiveFilterChips.vue`, `SortDropdown.vue`, `ProductPagination.vue`, `ProductSkeleton.vue`, `EmptyState.vue`.
- [x] components/cart: `CartButton.vue`.
- [x] composables: `useProducts.js`, `useProductFilters.js`, `useCart.js`, `useWishlist.js`, `useProductDetail.js`, `usePagination.js`, `useListingQuerySync.js`, `useSearchSuggestions.js`, `useRecentlyViewed.js`, `useAppHeader.js`, `useToast.js`, `useHorizontalScroll.js`.
- [x] services: `productService.js`.
- [ ] stores: optional `cartStore.js` initially (deferred; `useCart` / `useWishlist` cover shared state).
- [x] views: `ProductListingPage.vue`, `ProductDetailsPage.vue`, `FavoritesPage.vue`, `CartPage.vue`, `404Page.vue`.
- [x] router: `index.js`.
- [x] supporting: `utils/` (`productRoutes.js`, `variants.js`, `similarProducts.js`, `compareProducts.js`, …), `data/productVariants.js`, `constants/breakpoints.js`, `App.vue`.

| Layer       | Responsibility                                            |
| ----------- | --------------------------------------------------------- |
| View        | Coordinates page-level state and layout.                  |
| Components  | Render UI and emit user actions.                          |
| Composables | Encapsulate reusable reactive logic.                      |
| Services    | Fetch data and isolate API details.                       |
| Stores      | Share cart/wishlist state when complexity warrants it.    |
| Router      | Handle product navigation, URL query parameters, and 404. |

### Site 404 page

- Unknown paths use a catch-all route (`/:pathMatch(.*)*`, name `404-page`) that renders `404Page`.
- The page shows a clear “404 page” title and a Browse products action (no breadcrumbs).
- Product-details missing/invalid IDs still use the in-page `EmptyState` on `/product` (not a hard redirect to the site 404).

### Product details route

- Path: `/product?id=101&slug=wireless-headphones-pro` (route name `product-details`).
- `id` is required and drives the fetch; `slug` is optional readable text and is filled in when the product loads.
- Variant picks from card quick view are passed as `opts` (and `variant` when complete), e.g. `/product?id=83&slug=…&opts=Color%3ABlue%7CSize%3AM&variant=83-blue-m`. The details page hydrates `selectedOptions` from those query params and keeps them in sync when the user changes options.
- Old `/products/:id` URLs redirect to `/product?id=…` (slug is added after load).
- Loads one product via DummyJSON `GET /products/:id` (see `fetchProductById` / `useProductDetail`).
- Shows gallery, price/discount, stock, description, quantity stepper (− / typed input / +), Add to cart beside the stepper (label stays “Add to cart”; each click adds the selected qty to the cart, capped by stock), full-width Buy now below (Notify me when the product or selected combination is out of stock), favorites, and reviews when present. Out of stock: keep the quantity stepper visible but disabled; keep Add to cart disabled; Notify me records interest via toast (simulated back-in-stock alert).
- Gallery main image (Amazon-style zoom): on desktop (hover-capable pointers), a translucent square lens follows the cursor on the stage and a large zoomed preview panel appears to the right (overlaying the info column), showing the region under the lens. Touch / coarse pointers keep the plain gallery (no sticky lens or panel).
- When `options` / `variants` exist (local overlay): show option pickers (swatches for Color when a hex is known; chips otherwise). Require a complete, in-stock selection before Add to cart / Buy now. Price, SKU, qty max, and gallery frame follow the active variant. Incomplete selections show a clear hint and keep Add to cart / Buy now disabled. OOS combinations show a hint, keep qty / Add to cart disabled, and switch Buy now to Notify me.
- Similar products (below reviews / compare): horizontally scrollable row of products in the same category, ranked by shared brand and tags (`getSimilarProducts`). Show up to 8 cards; when more exist, a View all control opens the listing with the matching category (or brand) filter applied.
- Product comparison (below reviews, above Similar): only when at least one peer matches — same `category` and identical tags (`getComparableProducts`: normalized tag sets must be non-empty and equal — all tags matched; any brand; tags are match criteria only, not a table row). A “Compare with similar” button in the buy box opens the section. Shopper picks 1–3 peers (2–4 columns total including the current product). The current product is always included, locked, and visually highlighted (“This product”). Spec table covers price, brand, rating, availability, discount, category, warranty, shipping, and returns. Selection is local to the details page (resets when the product id changes). Hide the button and section when no peers exist.
- Recently viewed: opening a product details page records a product snapshot (newest first, max 8, deduped) in `localStorage` via `useRecentlyViewed`. Show a horizontal row on the listing (below the grid) and on details (below Similar, excluding the current product). Hide the section when empty. Cart / favorite actions on those cards use the same shared composables as the listing.
- Listing cards link image + title to details; out-of-stock “See All Options” opens the same page.
- Loading, error + Retry, and not-found states are required.

### Vue concepts to practise

- `ref()` for query, loading, error, and sort state.
- `reactive()` for grouped filter selections.
- `computed()` for derived product results and cart totals.
- `watch()` for reacting to search/filter changes.
- `onMounted()` for initial loading.
- `v-for`, `v-if`, `v-model` for rendering and form controls.
- Props and emits for parent/child communication.
- Vue Router for product details and query-string state.
- Pinia later, if shared cart/wishlist state becomes more complex.

Vue guide: https://vuejs.org/guide/introduction.html

## 6. UX, Accessibility, and Performance

### Visual and responsive UX

- Make category, result count, product name, price, and primary action easy to identify.
- Use consistent image ratios and reserve image space to avoid layout shifts.
- Use a shared mobile-first breakpoint scale (`md` / `lg` / `xl`). See below.
- Desktop (lg+): sticky sidebar filters; three-column grid (four from xl).
- Tablet (md): two-column grid and compact controls; filter drawer until lg.
- Mobile (below md): one-column list cards, touch-friendly controls, filter drawer, bottom nav, Load more (12 at a time).
- Do not rely on hover-only interactions; mobile users need visible, accessible controls.
- Avoid horizontal overflow and keep product names/prices readable.

### Accessibility

- Use semantic HTML and visible keyboard focus indicators.
- Provide a “Skip to main content” link as the first focusable element in `App.vue`, targeting the shared `#main-content` landmark that wraps `RouterView`.
- Label search, sorting, and filter controls.
- Provide meaningful alt text for product images.
- Make modals keyboard-accessible and manage focus correctly.
- Announce cart updates and important feedback to assistive technology.
- Use sufficient text contrast and appropriately sized touch targets.
- Aim for WCAG 2.2 AA where practical.

WCAG 2.2: https://www.w3.org/TR/WCAG22/

### Performance

- Request only the products needed for the current page when using server-side pagination.
- Use appropriately sized images and lazy-load below-the-fold images.
- Debounce API-backed search and avoid duplicate requests.
- Cancel obsolete requests and clean up listeners.
- Use stable product IDs as Vue keys.
- Avoid unnecessary recalculation and layout shifts.

## 7. Optional / Advanced Features

| Feature              | Benefit                                                                                                                              | Priority      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| URL-synced filters   | Shareable/bookmarkable listing state                                                                                                 | High          |
| Skeleton loading     | Improves perceived loading experience (`ProductSkeleton` on listing; filter sidebar uses CSS min-heights; details page skeleton)     | High (done)   |
| Persistent cart      | Retains cart after refresh                                                                                                           | High          |
| Toast notifications  | Confirms actions and explains errors (`success` / `info` / `favorite` / `error`)                                                     | High (done)   |
| Wishlist             | Save products for later                                                                                                              | Medium        |
| Quick View           | Preview without leaving listing                                                                                                      | Medium        |
| Product comparison   | Details-page compare: same category + all tags matched (any brand); 2–4 products; table below reviews (`ProductCompare`)             | Medium (done) |
| Recently viewed      | Return to previously explored products (`useRecentlyViewed` + listing/details row)                                                   | Medium (done) |
| Variant selection    | Choose color/size before adding (API/local overlay + PDP pickers + variant cart lines; listing card hover preview + mobile View all) | Medium (done) |
| Back-in-stock alerts | Express interest in unavailable products (details “Notify me” toast; no email backend yet)                                           | Advanced (partial) |

Example URL: `/?q=phone&category=smartphones&brand=Apple&minPrice=50&maxPrice=100&inStock=1&sort=price-asc&page=2` (also accepts `/products?…`). Implemented via Vue Router + `useListingQuerySync`: search, filters (including Availability → In stock), sort, and page restore after refresh and stay shareable/bookmarkable.

## 8. Edge Cases and Business Rules

| Scenario                        | Expected behavior                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No products / no matches        | Show a useful empty state and reset option.                                                                                                                                                                                                            |
| API failure                     | Show error and Retry action.                                                                                                                                                                                                                           |
| Missing image                   | Use a fallback image.                                                                                                                                                                                                                                  |
| No rating/reviews               | Hide the rating or show an unavailable state; do not invent data.                                                                                                                                                                                      |
| No compare peers                | Hide “Compare with similar” and the compare section when no same-category peer has an identical tag set.                                                                                                                                               |
| Compare at max (4)              | Disable adding more peers; current product stays locked. Clear selection or remove a peer to free a slot.                                                                                                                                              |
| Out of stock                    | Details: quantity stepper stays visible but disabled; Add to cart stays disabled; Buy now becomes Notify me (toast confirmation). Listing cards keep their existing out-of-stock CTA.                                                                   |
| Invalid discount                | Do not show negative or misleading savings.                                                                                                                                                                                                            |
| Filters changed on a later page | Reset to a valid page, normally page 1.                                                                                                                                                                                                                |
| Rapid search changes            | Prevent stale responses from overwriting current results.                                                                                                                                                                                              |
| Repeated Add to Cart            | Details page: each click adds the selected qty (stock-capped). Listing cards: first add, then “Go to cart”.                                                                                                                                            |
| Zero price                      | Display 0 correctly; do not treat it as missing.                                                                                                                                                                                                       |
| Variants required               | Details and card quick view: validate selected variant before adding. If a card/add path passes no variant, auto-pick the first in-stock SKU. Cart lines are keyed by variant id (or product id when there are no variants) and show selected options. |
| Refresh                         | Restore URL state and persisted cart if implemented.                                                                                                                                                                                                   |

## 9. Implementation Phases

| Phase         | Scope                                                                            | Deliverable                                |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Foundation | Vue setup, API fetch, grid/cards, loading/error/empty states, responsive layout. | Products render reliably from API.         |
| 2. Discovery  | Search, filters, sorting, active chips, clear all, pagination.                   | Search and listing controls work together. |
| 3. Shopping   | Cart, quantity updates, wishlist, feedback, optional Quick View.                 | Simulated shopping interactions.           |
| 4. Quality    | URL state, mobile drawer, cancellation, accessibility, edge cases, tests.        | Robust and maintainable listing page.      |

## 10. Acceptance Criteria / QA Checklist

### Product listing

- [ ] Products load from the API.
- [ ] Cards display correct product information.
- [ ] Images maintain their aspect ratio.
- [ ] Product links navigate correctly.
- [ ] Missing optional data does not break the layout.

### Search and filters

- [ ] Search matches the intended fields.
- [ ] Multiple filters work together.
- [ ] Sorting preserves filters and search.
- [ ] Active filters can be removed individually.
- [ ] Clear All resets filters.
- [ ] Counts reflect the current result set.
- [ ] Empty results are handled clearly.

### Sorting and pagination

- [ ] Every implemented sort option works.
- [ ] Pagination displays the correct products.
- [ ] Previous/Next controls work and disable correctly.
- [ ] Changing search/filters resets pagination appropriately (page 1 on md+; first 12 on mobile Load more).

### Shopping interactions

- [ ] Wishlist state updates correctly.
- [ ] Add to Cart updates cart count.
- [ ] Quantity updates follow defined rules.
- [ ] Out-of-stock products cannot be added.
- [ ] Products with variants require a valid selection on the details page before add/buy.
- [ ] Different variants of the same product appear as separate cart lines with option labels.
- [ ] Feedback is visible and understandable.

### Technical quality

- [ ] Loading, error, retry, and empty states are covered.
- [ ] Stale responses cannot overwrite newer results.
- [ ] Stable product IDs are used as Vue keys.
- [ ] No unnecessary API requests are triggered.
- [ ] No console errors occur during normal use.

### UX and accessibility

- [ ] Page works on desktop, tablet, and mobile.
- [ ] Touch and keyboard interactions work.
- [ ] Focus indicators and accessible labels are present.
- [ ] Skip to main content works with keyboard (Tab, then Enter/Space).
- [ ] Images have appropriate alt text.
- [ ] No horizontal overflow or major layout shifts occur.

## 11. Recommended Initial Scope

For the first version, keep the scope focused:

- Vue 3 + Composition API
- DummyJSON
- Responsive product cards
- Search by name/brand
- Category / brand / price / rating / stock filters
- Featured and price/rating sorting
- 12 products per page
- Simulated cart and wishlist
- Mobile filter drawer
- Complete loading / error / empty states

Start with client-side filtering and sorting if the dataset is small. Then move to a custom mock API with server-side filtering and pagination to practise a more realistic e-commerce architecture.
