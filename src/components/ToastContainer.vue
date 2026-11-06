<script setup>
/**
 * Renders the shared toast queue from useToast().
 * Mount once near the app root so messages appear above page chrome.
 *
 * aria-live="polite" + role="status" lets assistive tech announce new
 * toasts without interrupting the user mid-action.
 */
import { X } from "@lucide/vue";
import { useToast } from "@/composables/useToast.js";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div
    class="toast-region"
    aria-live="polite"
    aria-relevant="additions"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="status"
      >
        <p class="toast__message">{{ toast.message }}</p>
        <button
          type="button"
          class="toast__dismiss"
          aria-label="Dismiss notification"
          @click="dismiss(toast.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
