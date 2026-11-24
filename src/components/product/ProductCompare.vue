<script setup>
/**
 * ProductCompare — pick peers and show a side-by-side spec table on details.
 *
 * Vue ideas:
 * - Props bring in the current product + eligible peers (parent filters).
 * - Local `ref`s hold open state and which peer ids are selected.
 * - `computed` builds columns + rows so the table stays cheap to update.
 * - Current product is always column 1 and cannot be removed (highlighted).
 *
 * Rules: same category + all tags matched (any brand); 2–4 products total.
 */
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { RouterLink } from "vue-router";
import { Columns2, X } from "@lucide/vue";
import { PRODUCT_IMAGE_FALLBACK } from "@/utils/productModel.js";
import { productDetailsTo } from "@/utils/productRoutes.js";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  buildCompareRows,
} from "@/utils/compareProducts.js";

const props = defineProps({
  /** The product on the details page (always included / highlighted). */
  product: {
    type: Object,
    required: true,
  },
  /** Peers in the same category with identical tags (any brand). */
  candidates: {
    type: Array,
    default: () => [],
  },
});

const sectionEl = useTemplateRef("sectionEl");

/** Whether the picker + table panel is expanded. */
const isOpen = ref(false);

/**
 * Selected peer product ids (not including the current product).
 * Cap: COMPARE_MAX - 1 so total columns stay ≤ COMPARE_MAX.
 */
const selectedPeerIds = ref(/** @type {(number|string)[]} */ ([]));

const maxPeers = COMPARE_MAX - 1;

const candidateMap = computed(() => {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const entry of props.candidates) {
    if (!entry || entry.id == null) continue;
    map.set(String(entry.id), entry);
  }
  return map;
});

/** Drop peer ids that are no longer in the candidate list. */
watch(
  () => [props.product?.id, props.candidates],
  () => {
    const valid = new Set(
      props.candidates
        .filter((entry) => entry && entry.id != null)
        .map((entry) => String(entry.id)),
    );
    selectedPeerIds.value = selectedPeerIds.value.filter((id) =>
      valid.has(String(id)),
    );
  },
  { deep: true },
);

/** Reset selection when navigating to another product. */
watch(
  () => props.product?.id,
  () => {
    selectedPeerIds.value = [];
    isOpen.value = false;
  },
);

const selectedPeers = computed(() =>
  selectedPeerIds.value
    .map((id) => candidateMap.value.get(String(id)))
    .filter(Boolean),
);

/** Table columns: current product first, then selected peers. */
const columns = computed(() => {
  if (!props.product) return [];
  return [props.product, ...selectedPeers.value];
});

const rows = computed(() => buildCompareRows(columns.value));

const showTable = computed(() => columns.value.length >= COMPARE_MIN);

const canSelectMore = computed(() => selectedPeerIds.value.length < maxPeers);

const selectionHint = computed(() => {
  const selected = selectedPeerIds.value.length;
  if (selected === 0) {
    return `Select ${COMPARE_MIN - 1}–${maxPeers} similar products to compare.`;
  }
  if (!showTable.value) {
    return "Select at least one more product to see the table.";
  }
  if (!canSelectMore.value) {
    return `Comparing ${columns.value.length} of ${COMPARE_MAX} products.`;
  }
  return `Comparing ${columns.value.length} of ${COMPARE_MAX} products — you can add more.`;
});

/**
 * @param {number|string} peerId
 * @returns {boolean}
 */
function isPeerSelected(peerId) {
  return selectedPeerIds.value.some((id) => String(id) === String(peerId));
}

/**
 * Toggle a peer in/out of the comparison (respects the max).
 * @param {Record<string, unknown>} peer
 */
function togglePeer(peer) {
  if (!peer || peer.id == null) return;
  const key = String(peer.id);
  if (isPeerSelected(key)) {
    selectedPeerIds.value = selectedPeerIds.value.filter(
      (id) => String(id) !== key,
    );
    return;
  }
  if (!canSelectMore.value) return;
  selectedPeerIds.value = [...selectedPeerIds.value, peer.id];
}

function clearPeers() {
  selectedPeerIds.value = [];
}

function closePanel() {
  isOpen.value = false;
}

/**
 * Open the panel and scroll it into view (called from the details “Compare” button).
 */
async function openPanel() {
  isOpen.value = true;
  await nextTick();
  sectionEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

defineExpose({ openPanel, isOpen });
</script>

<template>
  <section
    ref="sectionEl"
    class="product-compare"
    :class="{ 'product-compare--open': isOpen }"
    aria-labelledby="compare-heading"
  >
    <div class="product-compare__header">
      <h2 id="compare-heading" class="product-compare__title">
        <Columns2 :size="20" aria-hidden="true" />
        Compare products
      </h2>
      <button
        v-if="isOpen"
        type="button"
        class="btn btn--link product-compare__close"
        @click="closePanel"
      >
        Hide
      </button>
    </div>

    <div v-if="!isOpen" class="product-compare__intro">
      <p class="product-compare__intro-text">
        Compare this product with others in the same category that share all the
        same tags — any brand.
      </p>
      <button
        type="button"
        class="btn btn--tertiary product-compare__open-btn"
        @click="openPanel"
      >
        Choose products
      </button>
    </div>

    <template v-else>
      <p class="product-compare__hint" role="status">
        {{ selectionHint }}
      </p>

      <!-- Current product is locked in; peers are toggles. -->
      <ul class="product-compare__picks" aria-label="Products to compare">
        <li class="product-compare__pick product-compare__pick--current">
          <span class="product-compare__pick-badge">This product</span>
          <img
            class="product-compare__pick-image"
            :src="product.thumbnail || product.image || PRODUCT_IMAGE_FALLBACK"
            alt=""
            width="48"
            height="48"
          />
          <span class="product-compare__pick-name">
            {{ product.title || product.name || "Untitled product" }}
          </span>
        </li>

        <li
          v-for="peer in candidates"
          :key="peer.id"
          class="product-compare__pick"
        >
          <button
            type="button"
            class="product-compare__pick-toggle"
            :class="{
              'product-compare__pick-toggle--selected': isPeerSelected(peer.id),
              'product-compare__pick-toggle--disabled':
                !isPeerSelected(peer.id) && !canSelectMore,
            }"
            :aria-pressed="isPeerSelected(peer.id)"
            :disabled="!isPeerSelected(peer.id) && !canSelectMore"
            :aria-label="
              isPeerSelected(peer.id)
                ? `Remove ${peer.title || peer.name} from comparison`
                : `Add ${peer.title || peer.name} to comparison`
            "
            @click="togglePeer(peer)"
          >
            <img
              class="product-compare__pick-image"
              :src="peer.thumbnail || peer.image || PRODUCT_IMAGE_FALLBACK"
              alt=""
              width="48"
              height="48"
            />
            <span class="product-compare__pick-meta">
              <span class="product-compare__pick-name">
                {{ peer.title || peer.name || "Untitled product" }}
              </span>
              <span v-if="peer.brand" class="product-compare__pick-brand">
                {{ peer.brand }}
              </span>
            </span>
            <span class="product-compare__pick-check" aria-hidden="true">
              {{ isPeerSelected(peer.id) ? "✓" : "+" }}
            </span>
          </button>
        </li>
      </ul>

      <div v-if="selectedPeerIds.length" class="product-compare__actions">
        <button type="button" class="btn btn--link" @click="clearPeers">
          Clear selection
        </button>
      </div>

      <div
        v-if="showTable"
        class="product-compare__table-wrap"
        role="region"
        aria-label="Comparison table"
        tabindex="0"
      >
        <table class="product-compare__table">
          <thead>
            <tr>
              <th scope="col" class="product-compare__attr-col">
                <span class="visually-hidden">Attribute</span>
              </th>
              <th
                v-for="(column, colIndex) in columns"
                :key="column.id"
                scope="col"
                class="product-compare__product-col"
                :class="{
                  'product-compare__product-col--current': colIndex === 0,
                }"
              >
                <div class="product-compare__col-head">
                  <span
                    v-if="colIndex === 0"
                    class="product-compare__col-badge"
                  >
                    This product
                  </span>
                  <button
                    v-else
                    type="button"
                    class="product-compare__col-remove"
                    :aria-label="`Remove ${column.title || column.name} from comparison`"
                    @click="togglePeer(column)"
                  >
                    <X :size="20" aria-hidden="true" />
                  </button>
                  <img
                    class="product-compare__col-image"
                    :src="
                      column.thumbnail || column.image || PRODUCT_IMAGE_FALLBACK
                    "
                    alt=""
                    width="72"
                    height="72"
                  />
                  <RouterLink
                    v-if="colIndex > 0"
                    class="product-compare__col-link"
                    :to="productDetailsTo(column)"
                  >
                    {{ column.title || column.name || "Untitled product" }}
                  </RouterLink>
                  <span v-else class="product-compare__col-link">
                    {{ column.title || column.name || "Untitled product" }}
                  </span>
                  <span v-if="column.brand" class="product-compare__col-brand">
                    {{ column.brand }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.key"
              :class="{ 'product-compare__row--differs': row.differs }"
            >
              <th scope="row" class="product-compare__row-label">
                {{ row.label }}
              </th>
              <td
                v-for="(value, valueIndex) in row.values"
                :key="`${row.key}-${columns[valueIndex]?.id}`"
                :class="{
                  'product-compare__cell--current': valueIndex === 0,
                }"
              >
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style>
@import "@/assets/styles/components/product-compare.css";
</style>
