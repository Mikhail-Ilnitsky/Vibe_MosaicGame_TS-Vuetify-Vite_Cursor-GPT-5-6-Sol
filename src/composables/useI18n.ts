import { computed, ref } from 'vue'
import type { Locale } from '../types'

const messages = {
  ru: {
    brand: 'МОЗАИКА',
    gameLabel: 'ИГРА-МОЗАИКА',
    galleryTitle: 'Выберите изображение',
    gallerySubtitle: 'Соберите картину из перемешанных квадратов',
    difficultyTitle: 'Выберите сложность',
    difficultySubtitle: 'Количество квадратов по меньшей стороне',
    pieces: 'фрагментов',
    moves: 'Ходы',
    showOriginal: 'Показать оригинал',
    showPuzzle: 'Вернуться к пазлу',
    exit: 'Выйти',
    win: 'У вас получилось!',
    winMoves: 'Количество ходов',
    newGame: 'Начать новую игру',
    loading: 'Загружаем изображение…',
    loadError: 'Не удалось загрузить изображение',
  },
  en: {
    brand: 'MOSAIC',
    gameLabel: 'MOSAIC GAME',
    galleryTitle: 'Choose an image',
    gallerySubtitle: 'Restore a picture from shuffled squares',
    difficultyTitle: 'Choose difficulty',
    difficultySubtitle: 'Number of squares along the shorter side',
    pieces: 'pieces',
    moves: 'Moves',
    showOriginal: 'Show original',
    showPuzzle: 'Return to puzzle',
    exit: 'Exit',
    win: 'You did it!',
    winMoves: 'Moves made',
    newGame: 'Start a new game',
    loading: 'Loading image…',
    loadError: 'Could not load the image',
  },
} as const

const initialLocale: Locale =
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().includes('ru')
    ? 'ru'
    : 'en'

const locale = ref<Locale>(initialLocale)

export function useI18n() {
  const t = computed(() => messages[locale.value])
  return { locale, t }
}
