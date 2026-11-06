/**
 * useToast — shared toast queue for short action feedback.
 *
 * Vue idea: refs declared at module scope are shared by every caller of
 * useToast(). That gives us a tiny global store without Pinia — any
 * component can call `toast.success('…')`, and ToastContainer reads
 * the same `toasts` list to render them.
 *
 * Accessibility: ToastContainer uses aria-live so screen readers announce
 * cart / favorites updates (see product-listing requirements §6).
 */
import { ref } from "vue";

/** @typedef {'success' | 'error' | 'info' | 'favorite'} ToastType */

/**
 * @typedef {object} Toast
 * @property {number} id
 * @property {string} message
 * @property {ToastType} type
 */

/** Shared reactive list — one queue for the whole app. */
const toasts = ref(/** @type {Toast[]} */ ([]));

let nextId = 0;

/**
 * @param {string} message
 * @param {{ type?: ToastType, duration?: number }} [options]
 */
function show(message, { type = "success", duration = 2800 } = {}) {
  const id = ++nextId;
  toasts.value = [...toasts.value, { id, message, type }];

  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration);
  }

  return id;
}

/** @param {number} id */
function dismiss(id) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

/**
 * @param {string} message
 * @param {{ duration?: number }} [options]
 */
function success(message, options = {}) {
  return show(message, { ...options, type: "success" });
}

/**
 * @param {string} message
 * @param {{ duration?: number }} [options]
 */
function error(message, options = {}) {
  return show(message, { ...options, type: "error" });
}

/**
 * @param {string} message
 * @param {{ duration?: number }} [options]
 */
function info(message, options = {}) {
  return show(message, { ...options, type: "info" });
}

/**
 * Favorites-specific feedback (separate icon/color from generic info).
 * @param {string} message
 * @param {{ duration?: number }} [options]
 */
function favorite(message, options = {}) {
  return show(message, { ...options, type: "favorite" });
}

export function useToast() {
  return {
    toasts,
    show,
    success,
    error,
    info,
    favorite,
    dismiss,
  };
}
