<script setup>
/**
 * ProductReviews — customer review list for the details page.
 */
defineProps({
  reviews: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <section
    v-if="reviews.length"
    class="product-details__reviews"
    aria-labelledby="reviews-heading"
  >
    <h2 id="reviews-heading" class="product-details__reviews-title">
      Customer reviews
    </h2>
    <ul class="product-details__reviews-list">
      <li
        v-for="(review, index) in reviews"
        :key="`${review.reviewerName}-${index}`"
        class="product-details__review"
      >
        <div class="product-details__review-header">
          <strong>{{ review.reviewerName || "Customer" }}</strong>
          <span
            v-if="typeof review.rating === 'number'"
            class="product-details__review-rating"
          >
            {{ review.rating.toFixed(1) }} ★
          </span>
        </div>
        <p v-if="review.comment" class="product-details__review-comment">
          {{ review.comment }}
        </p>
      </li>
    </ul>
  </section>
</template>
