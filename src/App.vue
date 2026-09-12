<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from './composables/useI18n'
import { IMAGES } from './data/images'
import type { Grid, MosaicImage, Piece, Screen } from './types'

const { locale, t } = useI18n()
const screen = ref<Screen>('gallery')
const selectedImage = ref<MosaicImage | null>(null)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const imageLoading = ref(false)
const imageError = ref(false)
const grid = ref<Grid | null>(null)
const pieces = ref<Piece[]>([])
const moves = ref(0)
const selectedIndex = ref<number | null>(null)
const showingOriginal = ref(false)
const victoryFlash = ref(false)
const completed = ref(false)
const boardArea = ref<HTMLElement | null>(null)
const boardWidth = ref(0)
const boardHeight = ref(0)
let resizeObserver: ResizeObserver | null = null
let victoryTimer: ReturnType<typeof setTimeout> | null = null

const difficulties = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const size = index + 5
    return {
      size,
      grid:
        naturalWidth.value && naturalHeight.value
          ? calculateGrid(size)
          : null,
    }
  }),
)

const boardStyle = computed(() => ({
  width: `${boardWidth.value}px`,
  height: `${boardHeight.value}px`,
  gridTemplateColumns: `repeat(${grid.value?.columns ?? 1}, 1fr)`,
  gridTemplateRows: `repeat(${grid.value?.rows ?? 1}, 1fr)`,
}))

const originalStyle = computed(() => ({
  backgroundImage: selectedImage.value
    ? `url("${selectedImage.value.url}")`
    : undefined,
}))

function calculateGrid(shortSideParts: number): Grid {
  const width = naturalWidth.value
  const height = naturalHeight.value
  const sourceTileSize = Math.floor(Math.min(width, height) / shortSideParts)
  const columns =
    width <= height ? shortSideParts : Math.floor(width / sourceTileSize)
  const rows =
    height <= width ? shortSideParts : Math.floor(height / sourceTileSize)
  const croppedWidth = columns * sourceTileSize
  const croppedHeight = rows * sourceTileSize

  return {
    rows,
    columns,
    sourceTileSize,
    croppedWidth,
    croppedHeight,
    offsetX: Math.floor((width - croppedWidth) / 2),
    offsetY: Math.floor((height - croppedHeight) / 2),
  }
}

function openImage(image: MosaicImage) {
  selectedImage.value = image
  screen.value = 'difficulty'
  imageLoading.value = true
  imageError.value = false
  naturalWidth.value = 0
  naturalHeight.value = 0

  const source = new Image()
  source.onload = () => {
    naturalWidth.value = source.naturalWidth
    naturalHeight.value = source.naturalHeight
    imageLoading.value = false
  }
  source.onerror = () => {
    imageLoading.value = false
    imageError.value = true
  }
  source.src = image.url
}

function startGame(shortSideParts: number) {
  grid.value = calculateGrid(shortSideParts)
  const total = grid.value.rows * grid.value.columns
  let shuffled: Piece[]

  do {
    shuffled = Array.from({ length: total }, (_, id) => ({
      id,
      x: id % grid.value!.columns,
      y: Math.floor(id / grid.value!.columns),
    }))
    for (let exchange = 0; exchange < total; exchange += 1) {
      const first = Math.floor(Math.random() * total)
      let second = Math.floor(Math.random() * total)
      while (second === first) second = Math.floor(Math.random() * total)
      ;[shuffled[first], shuffled[second]] = [shuffled[second], shuffled[first]]
    }
  } while (shuffled.every((piece, index) => piece.id === index))

  pieces.value = shuffled
  moves.value = 0
  selectedIndex.value = null
  showingOriginal.value = false
  completed.value = false
  victoryFlash.value = false
  screen.value = 'game'
  nextTick(updateBoardSize)
}

function exitToGallery() {
  if (victoryTimer) clearTimeout(victoryTimer)
  screen.value = 'gallery'
  selectedImage.value = null
  grid.value = null
  pieces.value = []
  selectedIndex.value = null
  showingOriginal.value = false
  completed.value = false
  victoryFlash.value = false
}

function pieceStyle(piece: Piece, index: number) {
  const currentGrid = grid.value
  if (!currentGrid || !selectedImage.value) return {}

  const positionX =
    currentGrid.columns === 1
      ? 0
      : (piece.x / (currentGrid.columns - 1)) * 100
  const positionY =
    currentGrid.rows === 1 ? 0 : (piece.y / (currentGrid.rows - 1)) * 100
  const isDragging = pointerState.value?.dragging && pointerState.value.index === index

  return {
    backgroundImage: `url("${selectedImage.value.url}")`,
    backgroundSize: `${currentGrid.columns * 100}% ${currentGrid.rows * 100}%`,
    backgroundPosition: `${positionX}% ${positionY}%`,
    transform: isDragging
      ? `translate3d(${pointerState.value!.dx}px, ${pointerState.value!.dy}px, 0)`
      : undefined,
    zIndex: isDragging ? 5 : undefined,
  }
}

interface PointerState {
  pointerId: number
  index: number
  startX: number
  startY: number
  dx: number
  dy: number
  dragging: boolean
}

const pointerState = ref<PointerState | null>(null)

function onPointerDown(event: PointerEvent, index: number) {
  if (showingOriginal.value || completed.value || event.button > 0) return
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  pointerState.value = {
    pointerId: event.pointerId,
    index,
    startX: event.clientX,
    startY: event.clientY,
    dx: 0,
    dy: 0,
    dragging: false,
  }
}

function onPointerMove(event: PointerEvent) {
  const state = pointerState.value
  if (!state || state.pointerId !== event.pointerId || !grid.value) return

  state.dx = event.clientX - state.startX
  state.dy = event.clientY - state.startY
  const tileSize = boardWidth.value / grid.value.columns
  if (Math.hypot(state.dx, state.dy) >= tileSize / 2) {
    state.dragging = true
  }
}

function onPointerUp(event: PointerEvent) {
  const state = pointerState.value
  if (!state || state.pointerId !== event.pointerId) return

  if (state.dragging) {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-piece-index]')
    const targetIndex = target ? Number(target.dataset.pieceIndex) : -1
    if (
      Number.isInteger(targetIndex) &&
      targetIndex >= 0 &&
      targetIndex !== state.index
    ) {
      swapPieces(state.index, targetIndex)
    }
  } else {
    handlePieceClick(state.index)
  }
  pointerState.value = null
}

function onPointerCancel() {
  pointerState.value = null
}

function handlePieceClick(index: number) {
  if (selectedIndex.value === null) {
    selectedIndex.value = index
    return
  }
  if (selectedIndex.value === index) {
    selectedIndex.value = null
    return
  }
  swapPieces(selectedIndex.value, index)
}

function swapPieces(first: number, second: number) {
  ;[pieces.value[first], pieces.value[second]] = [
    pieces.value[second],
    pieces.value[first],
  ]
  moves.value += 1
  selectedIndex.value = null

  if (pieces.value.every((piece, index) => piece.id === index)) {
    victoryFlash.value = true
    victoryTimer = setTimeout(() => {
      victoryFlash.value = false
      completed.value = true
    }, 500)
  }
}

function updateBoardSize() {
  if (!boardArea.value || !grid.value) return
  const availableWidth = boardArea.value.clientWidth
  const availableHeight = boardArea.value.clientHeight
  const ratio = grid.value.croppedWidth / grid.value.croppedHeight
  boardWidth.value = Math.min(
    availableWidth,
    availableHeight * ratio,
    grid.value.croppedWidth,
  )
  boardHeight.value = boardWidth.value / ratio
}

watch([screen, grid], () => nextTick(updateBoardSize))

onMounted(() => {
  resizeObserver = new ResizeObserver(updateBoardSize)
  if (boardArea.value) resizeObserver.observe(boardArea.value)
})

watch(boardArea, (element, previous) => {
  if (previous) resizeObserver?.unobserve(previous)
  if (element) resizeObserver?.observe(element)
  nextTick(updateBoardSize)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (victoryTimer) clearTimeout(victoryTimer)
})
</script>

<template>
  <v-app>
    <header class="topbar">
      <button
        class="brand"
        type="button"
        :aria-label="t.galleryTitle"
        @click="exitToGallery"
      >
        {{ t.brand }}
      </button>
      <div class="language-switch" :aria-label="locale === 'ru' ? 'Язык' : 'Language'">
        <button
          type="button"
          :class="{ active: locale === 'ru' }"
          @click="locale = 'ru'"
        >
          RU
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          :class="{ active: locale === 'en' }"
          @click="locale = 'en'"
        >
          EN
        </button>
      </div>
    </header>

    <main class="app-main" :class="`screen-${screen}`">
      <section v-if="screen === 'gallery'" class="gallery-screen">
        <div class="screen-heading">
          <p class="eyebrow">{{ t.gameLabel }}</p>
          <h1>{{ t.galleryTitle }}</h1>
          <p>{{ t.gallerySubtitle }}</p>
        </div>

        <div class="gallery">
          <button
            v-for="image in IMAGES"
            :key="image.id"
            class="gallery-card"
            type="button"
            @click="openImage(image)"
          >
            <span class="thumbnail-wrap">
              <img :src="image.url" :alt="image.title[locale]" />
              <span class="desktop-title">{{ image.title[locale] }}</span>
            </span>
            <span class="mobile-title">{{ image.title[locale] }}</span>
          </button>
        </div>
      </section>

      <section v-else-if="screen === 'difficulty'" class="difficulty-screen">
        <v-btn class="exit-button" variant="text" @click="exitToGallery">
          ← {{ t.exit }}
        </v-btn>

        <div class="screen-heading compact">
          <p class="eyebrow">{{ selectedImage?.title[locale] }}</p>
          <h1>{{ t.difficultyTitle }}</h1>
          <p>{{ t.difficultySubtitle }}</p>
        </div>

        <div v-if="imageLoading" class="load-state">
          <v-progress-circular indeterminate />
          <span>{{ t.loading }}</span>
        </div>
        <div v-else-if="imageError" class="load-state error">
          {{ t.loadError }}
        </div>
        <div v-else class="difficulty-grid">
          <button
            v-for="difficulty in difficulties"
            :key="difficulty.size"
            class="difficulty-card"
            type="button"
            @click="startGame(difficulty.size)"
          >
            <strong>{{ difficulty.size }}</strong>
            <span>
              {{ difficulty.grid?.rows }} × {{ difficulty.grid?.columns }}
              · {{ (difficulty.grid?.rows ?? 0) * (difficulty.grid?.columns ?? 0) }}
              {{ t.pieces }}
            </span>
          </button>
        </div>
      </section>

      <section v-else class="game-screen">
        <div class="game-controls">
          <v-btn class="exit-button" variant="text" @click="exitToGallery">
            ← {{ t.exit }}
          </v-btn>
          <p class="move-counter">{{ t.moves }}: <strong>{{ moves }}</strong></p>
          <v-btn
            class="original-button"
            variant="outlined"
            :disabled="completed"
            @click="showingOriginal = !showingOriginal"
          >
            {{ showingOriginal ? t.showPuzzle : t.showOriginal }}
          </v-btn>
        </div>

        <div ref="boardArea" class="board-area">
          <div
            class="mosaic-board"
            :class="{
              flashing: victoryFlash,
              completed,
              'showing-original': showingOriginal,
            }"
            :style="[boardStyle, completed || showingOriginal ? originalStyle : {}]"
          >
            <template v-if="!completed && !showingOriginal">
              <div
                v-for="(piece, index) in pieces"
                :key="piece.id"
                class="mosaic-piece"
                :class="{
                  selected: selectedIndex === index,
                  dragging: pointerState?.dragging && pointerState.index === index,
                }"
                :data-piece-index="index"
                :style="pieceStyle(piece, index)"
                @pointerdown="onPointerDown($event, index)"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerCancel"
              />
            </template>
          </div>
        </div>

        <Transition name="victory">
          <div v-if="completed" class="victory-message" role="status">
            <div>
              <h2>{{ t.win }}</h2>
              <p>{{ t.winMoves }}: {{ moves }}</p>
            </div>
            <v-btn color="primary" size="large" @click="exitToGallery">
              {{ t.newGame }}
            </v-btn>
          </div>
        </Transition>
      </section>
    </main>
  </v-app>
</template>
