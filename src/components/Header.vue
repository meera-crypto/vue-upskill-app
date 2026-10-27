<script setup>
/**
 * Header receives counts as props from App.
 *
 * ref(false) — reactive boolean for “is the mobile drawer open?”
 * On mobile the nav slides in from the right over the page.
 */
import { ref } from "vue";
import { Heart, ShoppingCart, User, Menu, X } from "@lucide/vue";
import logoUrl from "@/assets/images/logo.png";

defineProps({
  cartCount: {
    type: Number,
    default: 0,
  },
  favoriteCount: {
    type: Number,
    default: 0,
  },
});

const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}
</script>

<template>
  <header id="top" class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand">
        <img
          :src="logoUrl"
          alt="NexusCart — Smart E-Commerce"
          class="brand-logo"
        />
      </a>

      <button
        type="button"
        class="menu-toggle"
        :aria-expanded="menuOpen"
        aria-controls="header-nav"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="toggleMenu"
      >
        <Menu :size="26" />
      </button>

      <!-- Dimmed backdrop: tap outside drawer to close (mobile only) -->
      <div
        class="menu-backdrop"
        :class="{ 'menu-backdrop--open': menuOpen }"
        aria-hidden="true"
        @click="closeMenu"
      />

      <nav
        id="header-nav"
        class="header-nav"
        :class="{ 'header-nav--open': menuOpen }"
        aria-label="Shop actions"
      >
        <div class="header-nav__top">
          <p class="header-nav__title">Menu</p>
          <button
            type="button"
            class="menu-close"
            aria-label="Close menu"
            @click="closeMenu"
          >
            <X :size="24" />
          </button>
        </div>

        <a
          href="#favorites"
          class="nav-icon"
          aria-label="Favorites"
          @click="closeMenu"
        >
          <Heart :size="24" />
          <span class="nav-label">Favorites</span>
          <span v-if="favoriteCount > 0" class="nav-badge" aria-hidden="true">
            {{ favoriteCount }}
          </span>
        </a>
        <a
          href="#cart"
          class="nav-icon"
          aria-label="Cart"
          @click="closeMenu"
        >
          <ShoppingCart :size="24" />
          <span class="nav-label">Cart</span>
          <span v-if="cartCount > 0" class="nav-badge" aria-hidden="true">
            {{ cartCount }}
          </span>
        </a>
        <a
          href="#profile"
          class="nav-icon"
          aria-label="Profile"
          @click="closeMenu"
        >
          <User :size="24" />
          <span class="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  </header>
</template>
