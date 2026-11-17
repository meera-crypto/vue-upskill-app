<script setup>
/**
 * Footer layout:
 * 1. Trust strip — four feature cards from a data array (v-for + dynamic icon).
 * 2. Brand column (logo + social icons) + link menus.
 * 3. Legal / copyright row.
 *
 * menuColumns is plain data: each column has an id, title, and links[].
 * The template loops columns, then links — no duplicated markup.
 *
 * On mobile, each menu is an accordion (Plus / Minus). openMenus is a
 * reactive object: openMenus[id] === true means that section is expanded.
 * Tablet+ CSS always shows the lists; isMdUp keeps aria-expanded in sync.
 *
 * currentYear is computed once in <script setup> and shown with {{ }}.
 */
import { onMounted, onUnmounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Headset,
  Banknote,
  ShieldCheck,
  BadgeCheck,
  Plus,
  Minus,
} from "@lucide/vue";
import { mediaQueries } from "@/constants/breakpoints.js";
import logoUrl from "@/assets/images/logo.png";

const currentYear = new Date().getFullYear();

const trustFeatures = [
  {
    icon: Headset,
    title: "Support",
    description: "Friendly help whenever you need it.",
  },
  {
    icon: Banknote,
    title: "COD",
    description: "Pay cash when your order arrives.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty",
    description: "Covered against manufacturing defects.",
  },
  {
    icon: BadgeCheck,
    title: "Quality",
    description: "Products checked before they ship.",
  },
];

/** Footer link columns — structure mirrors common e-commerce footers. */
const menuColumns = [
  {
    id: "know-us",
    title: "Get to Know Us",
    links: [
      { label: "About Mercantile", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Press Releases", href: "#press" },
      { label: "Mercantile Science", href: "#science" },
    ],
  },
  {
    id: "make-money",
    title: "Make Money with Us",
    links: [
      { label: "Sell on Mercantile", href: "#sell" },
      { label: "Sell under Mercantile Accelerator", href: "#accelerator" },
      { label: "Protect and Build Your Brand", href: "#brand" },
      { label: "Mercantile Global Selling", href: "#global" },
      { label: "Supply to Mercantile", href: "#supply" },
      { label: "Become an Affiliate", href: "#affiliate" },
      { label: "Fulfilment by Mercantile", href: "#fulfilment" },
      { label: "Advertise Your Products", href: "#advertise" },
      { label: "Mercantile Pay on Merchants", href: "#pay" },
    ],
  },
  {
    id: "help-you",
    title: "Let Us Help You",
    links: [
      { label: "Your Account", href: "#account" },
      { label: "Returns Centre", href: "#returns" },
      { label: "Recalls and Product Safety Alerts", href: "#safety" },
      { label: "100% Purchase Protection", href: "#protection" },
      { label: "Mercantile App Download", href: "#app" },
      { label: "Help", href: "#help" },
    ],
  },
];

/** Which accordion sections are open on mobile (all start collapsed). */
const openMenus = reactive(
  Object.fromEntries(menuColumns.map((column) => [column.id, false])),
);

/** true from md up — menus stay expanded; toggle is decorative only. */
const isMdUp = ref(false);
/** @type {MediaQueryList | null} */
let mdUpQuery = null;

function syncMdUp() {
  isMdUp.value = Boolean(mdUpQuery?.matches);
}

function isMenuOpen(id) {
  return isMdUp.value || Boolean(openMenus[id]);
}

function toggleMenu(id) {
  if (isMdUp.value) return;
  openMenus[id] = !openMenus[id];
}

onMounted(() => {
  mdUpQuery = window.matchMedia(mediaQueries.mdUp);
  syncMdUp();
  mdUpQuery.addEventListener("change", syncMdUp);
});

onUnmounted(() => {
  mdUpQuery?.removeEventListener("change", syncMdUp);
  mdUpQuery = null;
});
</script>

<template>
  <footer class="site-footer">
    <!-- Trust features: 2-col mobile, 4-col from tablet up -->
    <div class="container footer-trust">
      <ul class="footer-trust__grid" role="list">
        <li
          v-for="item in trustFeatures"
          :key="item.title"
          class="footer-trust__item"
        >
          <component
            :is="item.icon"
            class="footer-trust__icon"
            :size="28"
            aria-hidden="true"
          />
          <div class="footer-trust__text">
            <h3 class="footer-trust__title">{{ item.title }}</h3>
            <p class="footer-trust__desc">{{ item.description }}</p>
          </div>
        </li>
      </ul>
    </div>

    <!-- Logo + socials (left) + link columns (right) -->
    <div class="container footer-main">
      <div class="footer-brand">
        <RouterLink :to="{ name: 'products' }" class="brand">
          <img
            :src="logoUrl"
            alt="Mercantile"
            class="brand-logo footer-brand__logo"
          />
        </RouterLink>
        <div class="footer-brand__meta">
          <p class="footer-brand__tagline">Everyday essentials, chosen well.</p>
          <nav class="footer-social" aria-label="Social media">
            <a
              href="https://instagram.com"
              class="nav-icon"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://x.com"
              class="nav-icon"
              aria-label="X / Twitter"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
                />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              class="nav-icon"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"
                />
              </svg>
            </a>
            <a
              href="https://youtube.com"
              class="nav-icon"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"
                />
              </svg>
            </a>
          </nav>
        </div>
      </div>

      <nav class="footer-menus" aria-label="Footer">
        <div
          v-for="column in menuColumns"
          :key="column.id"
          class="footer-menu"
          :class="{ 'footer-menu--open': isMenuOpen(column.id) }"
        >
          <h3 class="footer-menu__heading">
            <button
              type="button"
              class="footer-menu__toggle"
              :id="`footer-menu-heading-${column.id}`"
              :aria-expanded="isMenuOpen(column.id)"
              :aria-controls="`footer-menu-panel-${column.id}`"
              :tabindex="isMdUp ? -1 : 0"
              @click="toggleMenu(column.id)"
            >
              <span class="footer-menu__title">{{ column.title }}</span>
              <Minus
                v-if="isMenuOpen(column.id)"
                class="footer-menu__icon"
                :size="18"
                aria-hidden="true"
              />
              <Plus
                v-else
                class="footer-menu__icon"
                :size="18"
                aria-hidden="true"
              />
            </button>
          </h3>
          <ul
            :id="`footer-menu-panel-${column.id}`"
            class="footer-menu__list"
            role="list"
            :aria-labelledby="`footer-menu-heading-${column.id}`"
          >
            <li
              v-for="link in column.links"
              :key="link.label"
              class="footer-menu__item"
            >
              <a :href="link.href" class="footer-menu__link">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="container footer-legal">
      <p class="footer-copy">
        &copy; {{ currentYear }} Mercantile. All rights reserved.
      </p>
      <a href="#terms" class="nav-link">Terms and Conditions</a>
    </div>
  </footer>
</template>
