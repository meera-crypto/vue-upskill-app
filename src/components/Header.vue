<script setup>
import logoUrl from '@/assets/images/logo.png'
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand">
        <img :src="logoUrl" alt="NexusCart — Smart E-Commerce" class="brand-logo" />
      </a>

      <nav class="header-nav" aria-label="Shop actions">
        <a href="#favorites" class="nav-link">Favorites</a>
        <a href="#cart" class="nav-link">Cart</a>
      </nav>
    </div>
  </header>
</template>
