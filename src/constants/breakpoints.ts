/**
 *
 * Mobile-first names (Tailwind-style): md / lg / xl.
 * Base layout is mobile; these are the min-widths where layout steps up.
 */
export const breakpoints = {
  /** Tablet+ */
  md: 768,
  /** Desktop+ */
  lg: 1024,
  /** Wide */
  xl: 1280,
};

/** Ready-to-use media query strings for matchMedia / <picture>. */
export const mediaQueries = {
  /** Below md — phone layout (necessary max-width for JS / picture). */
  untilMd: `(max-width: ${breakpoints.md - 1}px)`,
  mdUp: `(min-width: ${breakpoints.md}px)`,
  lgUp: `(min-width: ${breakpoints.lg}px)`,
  xlUp: `(min-width: ${breakpoints.xl}px)`,
};
