<script setup lang="ts">
/**
 * EmptyState — shared message + actions for empty / error / not-found UI.
 *
 * Vue idea: default slot for custom message markup; named `actions` slot for
 * buttons. Parents pass `variant="error"` when it should be announced as an
 * alert (API failure) instead of a polite status (no matches).
 */
defineProps({
  /** Plain-text message when you do not need custom markup. */
  message: {
    type: String,
    default: "",
  },
  /**
   * `default` = status (no matches);
   * `error` = alert (API failure);
   * `not-found` = status for missing pages / products.
   */
  variant: {
    type: String,
    default: "default",
    validator: (value: string) => ["default", "error", "not-found"].includes(value),
  },
});
</script>

<template>
  <div
    class="empty-state"
    :class="{
      'empty-state--error': variant === 'error',
      'empty-state--not-found': variant === 'not-found',
    }"
    :role="variant === 'error' ? 'alert' : 'status'"
    :aria-live="variant === 'error' ? undefined : 'polite'"
  >
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <div v-else-if="$slots.default" class="empty-state__message">
      <slot />
    </div>

    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
