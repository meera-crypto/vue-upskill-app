/**
 * useHorizontalScroll — overflow arrows for a horizontal scroller.
 *
 * Pass a template ref to the scrollable element. Returns:
 * - canOverflow / canScrollLeft / canScrollRight — for showing arrows
 * - scrollByDirection(-1 | 1) — smooth scroll about ¾ of the viewport
 * - refreshScroll() — re-bind after the list contents change
 *
 * Used by ProductCarousel so Similar products and Recently viewed share
 * one scroll implementation.
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";

/**
 * @param scrollEl template ref of the scrollable element
 * @param watchKey any reactive value that changes when the list should
 *   remeasure (e.g. product count)
 */
export function useHorizontalScroll(
  scrollEl: Ref<HTMLElement | null>,
  watchKey: Ref<unknown> | ComputedRef<unknown>,
) {
  const canOverflow = ref(false);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(false);

  let resizeObserver: ResizeObserver | null = null;
  let boundScrollEl: HTMLElement | null = null;

  function updateScrollState() {
    const el = scrollEl.value;
    if (!el) {
      canOverflow.value = false;
      canScrollLeft.value = false;
      canScrollRight.value = false;
      return;
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    canOverflow.value = maxScroll > 1;
    canScrollLeft.value = el.scrollLeft > 1;
    canScrollRight.value = maxScroll > 1 && el.scrollLeft < maxScroll - 1;
  }

  function scrollByDirection(direction: -1 | 1) {
    const el = scrollEl.value;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.75, 240);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function bindScrollObservers() {
    if (boundScrollEl) {
      boundScrollEl.removeEventListener("scroll", updateScrollState);
    }
    resizeObserver?.disconnect();
    resizeObserver = null;

    const el = scrollEl.value;
    boundScrollEl = el ?? null;
    if (!el) {
      updateScrollState();
      return;
    }

    el.addEventListener("scroll", updateScrollState, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }
    updateScrollState();
  }

  async function refreshScroll() {
    await nextTick();
    bindScrollObservers();
    requestAnimationFrame(() => {
      updateScrollState();
    });
  }

  watch(
    () => watchKey?.value,
    () => {
      refreshScroll();
    },
  );

  onMounted(() => {
    window.addEventListener("resize", updateScrollState);
    refreshScroll();
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    boundScrollEl?.removeEventListener("scroll", updateScrollState);
    boundScrollEl = null;
    window.removeEventListener("resize", updateScrollState);
  });

  return {
    canOverflow,
    canScrollLeft,
    canScrollRight,
    scrollByDirection,
    refreshScroll,
  };
}
