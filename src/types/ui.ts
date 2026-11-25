/**
 * Small UI-only shapes shared by presentational components.
 * (Product data types live in `@/types/product`.)
 */
import type { RouteLocationRaw } from "vue-router";

/** One crumb in `Breadcrumbs.vue`; the last item is the current page (no `to`). */
export interface BreadcrumbItem {
  label: string;
  to?: RouteLocationRaw;
}
