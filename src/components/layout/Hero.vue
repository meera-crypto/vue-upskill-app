<script setup>
/**
 * Hero — category banner above the product list (tablet+ only).
 * Hidden on mobile via CSS in hero.css so the listing starts sooner.
 *
 * Props let App (or a parent) customize the copy without editing this file.
 * Defaults keep the page usable even with no props passed.
 *
 * Vue concept: defineProps() — declare what data this component accepts
 * from its parent. Values flow one way: parent → child.
 */
defineProps({
  title: {
    type: String,
    default: "Everyday essentials, chosen well",
  },
  description: {
    type: String,
    default:
      "From beauty and home to tech and style — explore curated picks with clear pricing, ratings, and stock you can trust.",
  },
  ctaLabel: {
    type: String,
    default: "Start shopping",
  },
  ctaHref: {
    type: String,
    default: "#products",
  },
});
</script>

<template>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="container hero__inner">
      <h1 id="hero-heading" class="hero__title">{{ title }}</h1>
      <p class="hero__description">{{ description }}</p>
      <a :href="ctaHref" class="btn btn--primary hero__cta">{{ ctaLabel }}</a>
    </div>
  </section>
</template>
