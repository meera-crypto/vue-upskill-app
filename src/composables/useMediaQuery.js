/**
 * useMediaQuery — reactive match for a CSS media query.
 *
 * Useful for layout decisions that CSS alone can’t handle (e.g. skip
 * pagination on mobile and show the full filtered list instead).
 *
 * Vue idea: a `ref` updated by `matchMedia`’s change event.
 */
import { ref, onMounted, onUnmounted } from "vue";

/**
 * @param {string} query e.g. "(max-width: 767px)"
 */
export function useMediaQuery(query) {
  const matches = ref(false);

  /** @type {MediaQueryList | null} */
  let mediaQueryList = null;

  function sync() {
    matches.value = mediaQueryList?.matches ?? false;
  }

  onMounted(() => {
    mediaQueryList = window.matchMedia(query);
    sync();
    mediaQueryList.addEventListener("change", sync);
  });

  onUnmounted(() => {
    mediaQueryList?.removeEventListener("change", sync);
  });

  return matches;
}
