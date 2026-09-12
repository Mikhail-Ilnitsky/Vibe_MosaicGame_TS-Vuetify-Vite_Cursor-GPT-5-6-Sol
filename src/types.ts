export type Locale = 'ru' | 'en'
export type Screen = 'gallery' | 'difficulty' | 'game'
export type Orientation = 'landscape' | 'portrait' | 'square'

export interface MosaicImage {
  id: string
  url: string
  orientation: Orientation
  title: Record<Locale, string>
}

export interface Grid {
  rows: number
  columns: number
  sourceTileSize: number
  croppedWidth: number
  croppedHeight: number
  offsetX: number
  offsetY: number
}

export interface Piece {
  id: number
  x: number
  y: number
}
