/**
 * useToast — shared toast queue for short action feedback.
 *
 * Vue idea: refs declared at module scope are shared by every caller of
 * useToast(). That gives us a tiny global store without Pinia — any
 * component can call `toast.success('…')`, and ToastContainer reads
 * the same `toasts` list to render them.
 */
import { ref } from "vue";

export type ToastType = "success" | "error" | "info" | "favorite";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/** Shared reactive list — one queue for the whole app. */
const toasts = ref<Toast[]>([]);

let nextId = 0;

function show(message: string, { type = "success", duration = 2800 }: ToastOptions = {}) {
  const id = ++nextId;
  toasts.value = [...toasts.value, { id, message, type }];

  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration);
  }

  return id;
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

function success(message: string, options: Omit<ToastOptions, "type"> = {}) {
  return show(message, { ...options, type: "success" });
}

function error(message: string, options: Omit<ToastOptions, "type"> = {}) {
  return show(message, { ...options, type: "error" });
}

function info(message: string, options: Omit<ToastOptions, "type"> = {}) {
  return show(message, { ...options, type: "info" });
}

function favorite(message: string, options: Omit<ToastOptions, "type"> = {}) {
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
