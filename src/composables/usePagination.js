/**
 * usePagination — slices a list into pages (client-side).
 *
 * Pipeline order from the requirements:
 *   Search → Filter → Sort → Paginate
 *
 * This composable only does the last step. Pass already-filtered products in.
 *
 * Vue ideas:
 * - `ref(page)` — current page number (1-based)
 * - `computed` — total pages, current slice, “Showing X–Y of Z”
 * - `watch` — reset / clamp page when the result set changes
 */
import { ref, computed, unref, watch } from "vue";

/**
 * @param {import('vue').Ref<unknown[]> | unknown[]} sourceItems
 * @param {{ pageSize?: number }} [options]
 */
export function usePagination(sourceItems, options = {}) {
  const { pageSize = 12 } = options;

  const page = ref(1);

  const items = computed(() => {
    const list = unref(sourceItems);
    return Array.isArray(list) ? list : [];
  });

  const total = computed(() => items.value.length);

  const totalPages = computed(() =>
    total.value === 0 ? 1 : Math.ceil(total.value / pageSize),
  );

  const paginatedItems = computed(() => {
    const start = (page.value - 1) * pageSize;
    return items.value.slice(start, start + pageSize);
  });

  /** Inclusive 1-based range for “Showing 1–12 of 194”. */
  const range = computed(() => {
    if (total.value === 0) {
      return { start: 0, end: 0 };
    }
    const start = (page.value - 1) * pageSize + 1;
    const end = Math.min(page.value * pageSize, total.value);
    return { start, end };
  });

  const canPrev = computed(() => page.value > 1);
  const canNext = computed(() => page.value < totalPages.value);

  /**
   * Compact page list with ellipsis, e.g. [1, '…', 4, 5, 6, '…', 12].
   * Keeps the control readable when there are many pages.
   */
  const pageItems = computed(() => {
    const totalP = totalPages.value;
    const current = page.value;

    if (totalP <= 7) {
      return Array.from({ length: totalP }, (_, i) => i + 1);
    }

    /** @type {(number|string)[]} */
    const itemsOut = [];
    const add = (value) => {
      if (itemsOut[itemsOut.length - 1] !== value) itemsOut.push(value);
    };

    add(1);

    const left = Math.max(2, current - 1);
    const right = Math.min(totalP - 1, current + 1);

    if (left > 2) add("…");

    for (let n = left; n <= right; n += 1) {
      add(n);
    }

    if (right < totalP - 1) add("…");

    add(totalP);
    return itemsOut;
  });

  function goToPage(nextPage) {
    const n = Number(nextPage);
    if (!Number.isFinite(n)) return;
    page.value = Math.min(Math.max(Math.trunc(n), 1), totalPages.value);
  }

  function next() {
    if (canNext.value) page.value += 1;
  }

  function prev() {
    if (canPrev.value) page.value -= 1;
  }

  /**
   * New result set (search or filter change) → back to page 1.
   * Compare a cheap fingerprint so we only reset when the list identity
   * actually changes, then clamp if the page is past the end.
   */
  watch(
    () => {
      const list = items.value;
      if (list.length === 0) return "0";
      const first = list[0]?.id ?? "";
      const last = list[list.length - 1]?.id ?? "";
      return `${list.length}:${first}:${last}`;
    },
    () => {
      page.value = 1;
    },
  );

  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages;
  });

  return {
    page,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    range,
    pageItems,
    canPrev,
    canNext,
    goToPage,
    next,
    prev,
  };
}
