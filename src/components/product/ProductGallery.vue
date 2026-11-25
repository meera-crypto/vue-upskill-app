<script setup lang="ts">
import type { Product } from "@/types/product";
/**
 * ProductGallery — thumbs, main stage, desktop hover zoom, favorite control.
 *
 * Vue idea: the details page used to own all of this state inline. Extracting
 * it keeps ProductDetailsPage as an orchestrator (load product → pass props).
 */
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import type { PropType } from "vue";
import { ChevronLeft, ChevronRight, Heart } from "@lucide/vue";
import { PRODUCT_IMAGE_FALLBACK } from "@/utils/productModel";
import { useHorizontalScroll } from "@/composables/useHorizontalScroll";

const props = defineProps({
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
  displayName: {
    type: String,
    default: "Product",
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  /**
   * When a selected variant maps to a gallery frame, the parent passes
   * that index so the stage jumps without owning gallery state.
   */
  variantImageIndex: {
    type: Number as PropType<number | null>,
    default: null,
  },
});

const emit = defineEmits<{ (e: "toggle-favorite"): void }>();

const selectedImageIndex = ref(0);
const thumbsScrollEl = useTemplateRef("thumbsScroll");

const isZooming = ref(false);
const lensStyle = ref<Record<string, string>>({});
const zoomResultStyle = ref(/** @type {Record<string, string>} */ ({}));
const ZOOM_LEVEL = 2;
const ZOOM_RESULT_SCALE = 0.65;

const images = computed(() => {
  const list = Array.isArray(props.product?.images)
    ? props.product.images.filter(
        (url) => typeof url === "string" && url.length > 0,
      )
    : [];
  return list.length > 0 ? list : [PRODUCT_IMAGE_FALLBACK];
});

const imagesCount = computed(() => images.value.length);

const {
  canOverflow: thumbsCanOverflow,
  canScrollLeft: thumbsCanScrollLeft,
  canScrollRight: thumbsCanScrollRight,
  scrollByDirection: scrollThumbsByDirection,
} = useHorizontalScroll(thumbsScrollEl, imagesCount);

const canShowGalleryArrows = computed(() => imagesCount.value > 1);
const canGoPrevImage = computed(() => selectedImageIndex.value > 0);
const canGoNextImage = computed(
  () => selectedImageIndex.value < imagesCount.value - 1,
);

const activeImage = computed(
  () => images.value[selectedImageIndex.value] ?? images.value[0],
);

function clearZoom() {
  isZooming.value = false;
  lensStyle.value = {};
  zoomResultStyle.value = {};
}

watch(
  () => props.product?.id,
  () => {
    clearZoom();
    selectedImageIndex.value = 0;
  },
);

watch(
  () => props.variantImageIndex,
  (index) => {
    if (index == null) return;
    if (Number.isFinite(index) && index >= 0 && index < images.value.length) {
      selectImage(index);
    }
  },
);

watch(activeImage, (url) => {
  if (!isZooming.value) return;
  if (!url) {
    clearZoom();
    return;
  }
  zoomResultStyle.value = {
    ...zoomResultStyle.value,
    backgroundImage: `url(${JSON.stringify(url)})`,
  };
});

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  if (img.src !== PRODUCT_IMAGE_FALLBACK) {
    img.src = PRODUCT_IMAGE_FALLBACK;
  }
}

function scrollActiveThumbIntoView() {
  const list = thumbsScrollEl.value;
  if (!list) return;
  const thumb = list.querySelector(
    `[data-thumb-index="${selectedImageIndex.value}"]`,
  );
  if (!(thumb instanceof HTMLElement)) return;
  thumb.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

async function selectImage(index: number) {
  if (index < 0 || index >= images.value.length) return;
  selectedImageIndex.value = index;
  await nextTick();
  scrollActiveThumbIntoView();
}

function goToPrevImage() {
  if (!canGoPrevImage.value) return;
  selectImage(selectedImageIndex.value - 1);
}

function goToNextImage() {
  if (!canGoNextImage.value) return;
  selectImage(selectedImageIndex.value + 1);
}

function canUseImageZoom() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px)",
    ).matches
  );
}

function isGalleryChromeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".product-details__gallery-arrow") ||
      target.closest(".product-details__favorite"),
  );
}

function onZoomEnter(event: MouseEvent) {
  if (!canUseImageZoom()) return;
  if (isGalleryChromeTarget(event.target)) return;
  isZooming.value = true;
}

function onZoomLeave() {
  clearZoom();
}

function onZoomMove(event: MouseEvent) {
  if (!canUseImageZoom()) return;

  if (isGalleryChromeTarget(event.target)) {
    isZooming.value = false;
    return;
  }

  const stage = event.currentTarget as HTMLElement;
  const rect = stage.getBoundingClientRect();
  const resultW = rect.width * ZOOM_RESULT_SCALE;
  const resultH = rect.height * ZOOM_RESULT_SCALE;
  const lensW = resultW / ZOOM_LEVEL;
  const lensH = resultH / ZOOM_LEVEL;

  const lensX = Math.max(
    0,
    Math.min(event.clientX - rect.left - lensW / 2, rect.width - lensW),
  );
  const lensY = Math.max(
    0,
    Math.min(event.clientY - rect.top - lensH / 2, rect.height - lensH),
  );

  lensStyle.value = {
    width: `${lensW}px`,
    height: `${lensH}px`,
    left: `${lensX}px`,
    top: `${lensY}px`,
  };

  zoomResultStyle.value = {
    width: `${resultW}px`,
    height: `${resultH}px`,
    backgroundImage: `url(${JSON.stringify(activeImage.value)})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${rect.width * ZOOM_LEVEL}px ${rect.height * ZOOM_LEVEL}px`,
    backgroundPosition: `-${lensX * ZOOM_LEVEL}px -${lensY * ZOOM_LEVEL}px`,
  };
  isZooming.value = true;
}
</script>

<template>
  <section class="product-details__gallery" aria-label="Product images">
    <div v-if="images.length > 1" class="product-details__thumbs-viewport">
      <ul
        ref="thumbsScroll"
        class="product-details__thumbs"
        aria-label="More images"
      >
        <li v-for="(url, index) in images" :key="`${url}-${index}`">
          <button
            type="button"
            class="product-details__thumb"
            :data-thumb-index="index"
            :class="{
              'product-details__thumb--active': index === selectedImageIndex,
            }"
            :aria-label="`View image ${index + 1}`"
            :aria-current="index === selectedImageIndex ? 'true' : undefined"
            @click="selectImage(index)"
          >
            <img
              :src="url"
              :alt="`${displayName} thumbnail ${index + 1}`"
              width="72"
              height="72"
              loading="lazy"
              @error="onImageError"
            />
          </button>
        </li>
      </ul>

      <button
        v-if="thumbsCanOverflow && thumbsCanScrollLeft"
        type="button"
        class="product-details__thumbs-arrow product-details__thumbs-arrow--prev"
        aria-label="Scroll thumbnails left"
        @click="scrollThumbsByDirection(-1)"
      >
        <ChevronLeft :size="22" aria-hidden="true" />
      </button>
      <button
        v-if="thumbsCanOverflow && thumbsCanScrollRight"
        type="button"
        class="product-details__thumbs-arrow product-details__thumbs-arrow--next"
        aria-label="Scroll thumbnails right"
        @click="scrollThumbsByDirection(1)"
      >
        <ChevronRight :size="22" aria-hidden="true" />
      </button>
    </div>

    <div
      class="product-details__stage"
      @mouseenter="onZoomEnter"
      @mousemove="onZoomMove"
      @mouseleave="onZoomLeave"
    >
      <img
        class="product-details__image"
        :src="activeImage"
        :alt="displayName"
        width="500"
        height="500"
        @error="onImageError"
      />
      <div
        v-show="isZooming"
        class="product-details__lens"
        :style="lensStyle"
        aria-hidden="true"
      />

      <button
        v-if="canShowGalleryArrows && canGoPrevImage"
        type="button"
        class="product-details__gallery-arrow product-details__gallery-arrow--prev"
        aria-label="Previous image"
        @click="goToPrevImage"
      >
        <ChevronLeft :size="24" aria-hidden="true" />
      </button>
      <button
        v-if="canShowGalleryArrows && canGoNextImage"
        type="button"
        class="product-details__gallery-arrow product-details__gallery-arrow--next"
        aria-label="Next image"
        @click="goToNextImage"
      >
        <ChevronRight :size="24" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="product-details__favorite"
        :class="{ 'product-details__favorite--active': favorited }"
        :aria-label="favorited ? 'Remove from favorites' : 'Add to favorites'"
        :aria-pressed="favorited"
        @click="emit('toggle-favorite')"
      >
        <Heart
          :size="22"
          :fill="favorited ? 'currentColor' : 'none'"
          aria-hidden="true"
        />
      </button>
    </div>

    <div
      v-show="isZooming"
      class="product-details__zoom-result"
      :style="zoomResultStyle"
      aria-hidden="true"
    />
  </section>
</template>
