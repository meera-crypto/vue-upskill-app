/**
 * useFocusTrap — keep Tab focus inside a container while `active` is true.
 *
 * Vue ideas:
 * - `watch` the active flag to move focus in/out
 * - `onUnmounted` cleans document listeners
 * - Escape calls `onEscape` (e.g. close a drawer)
 *
 * Useful for mobile filter drawers / dialogs (WCAG keyboard access).
 */
import { watch, nextTick, unref, onUnmounted } from "vue";

/**
 * @param {import('vue').Ref<HTMLElement | null> | HTMLElement | null} containerSource
 * @param {import('vue').Ref<boolean> | boolean} activeSource
 * @param {{ onEscape?: () => void }} [options]
 */
export function useFocusTrap(containerSource, activeSource, options = {}) {
  const { onEscape } = options;

  /** Element that had focus before the trap activated. */
  let previouslyFocused = null;

  /**
   * @param {HTMLElement} root
   * @returns {HTMLElement[]}
   */
  function getFocusable(root) {
    const nodes = root.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    return [...nodes].filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.hasAttribute("disabled")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.tabIndex < 0 && el.getAttribute("tabindex") !== "0") {
        /* tabindex="-1" is only for programmatic focus (e.g. the drawer root). */
        return false;
      }
      /* visibility check — avoid offsetParent (null for position:fixed). */
      const style = window.getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none";
    });
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeydown(event) {
    if (!unref(activeSource)) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onEscape?.();
      return;
    }

    if (event.key !== "Tab") return;

    const root = unref(containerSource);
    if (!(root instanceof HTMLElement)) return;

    const focusable = getFocusable(root);
    if (focusable.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !root.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || !root.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  async function activate() {
    const root = unref(containerSource);
    if (!(root instanceof HTMLElement)) return;

    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    await nextTick();
    const focusable = getFocusable(root);
    (focusable[0] ?? root).focus();
    document.addEventListener("keydown", onKeydown);
  }

  function deactivate() {
    document.removeEventListener("keydown", onKeydown);
    if (
      previouslyFocused instanceof HTMLElement &&
      document.contains(previouslyFocused)
    ) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  watch(
    () => Boolean(unref(activeSource)),
    (active) => {
      if (active) {
        activate();
      } else {
        deactivate();
      }
    },
  );

  onUnmounted(() => {
    document.removeEventListener("keydown", onKeydown);
  });
}
