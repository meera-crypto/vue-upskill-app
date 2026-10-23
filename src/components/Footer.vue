<script setup>
import logoUrl from '@/assets/images/logo.png'
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <a href="/" class="brand">
        <img :src="logoUrl" alt="NexusCart — Smart E-Commerce" class="brand-logo" />
      </a>

      <nav class="footer-nav" aria-label="Footer">
        <a href="#about" class="nav-link">About Us</a>
        <a href="#contact" class="nav-link">Contact Us</a>
      </nav>
    </div>
  </footer>
</template>
