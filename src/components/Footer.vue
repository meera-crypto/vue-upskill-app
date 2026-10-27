<script setup>
/**
 * Left column: text links stacked (flex-direction: column).
 * Right side: social icons (inline SVGs — Lucide dropped brand logos).
 *
 * "Back to top" uses href="#top". Add id="top" on a page wrapper
 * (or rely on the browser scrolling to the document top).
 *
 * currentYear is plain JS in <script setup> — available in the template
 * as {{ currentYear }} (mustache interpolation).
 */
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <nav class="footer-nav" aria-label="Footer">
        <a href="#top" class="nav-link">Back to top</a>
        <a href="#about" class="nav-link">About Us</a>
        <a href="#contact" class="nav-link">Contact Us</a>
      </nav>

      <nav class="footer-social" aria-label="Social media">
        <a
          href="https://instagram.com"
          class="nav-icon"
          aria-label="Instagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
        </a>
        <a
          href="https://facebook.com"
          class="nav-icon"
          aria-label="Facebook"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
          </svg>
        </a>
        <a
          href="https://youtube.com"
          class="nav-icon"
          aria-label="YouTube"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
          </svg>
        </a>
      </nav>
    </div>

    <!-- Second row: legal line under the main footer content -->
    <div class="container footer-legal">
      <p class="footer-copy">&copy; {{ currentYear }} NexusCart. All rights reserved.</p>
      <a href="#terms" class="nav-link">Terms and Conditions</a>
    </div>
  </footer>
</template>

