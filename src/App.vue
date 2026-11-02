<script setup>
/**
 * App.vue — root shell. Vue Router picks which page to show in <RouterView />.
 * ToastContainer sits here so any page can call useToast() and the message
 * still appears above the current view.
 */
import ToastContainer from "@/components/ToastContainer.vue";
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
