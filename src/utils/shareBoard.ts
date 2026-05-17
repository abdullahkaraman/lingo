import type { GuessRow } from '../types/game'

const TILE_SIZE = 56
const GAP = 6
const PAD = 20
const HEADER = 64

const COLOR: Record<string, string> = {
  correct: '#16a34a',
  present: '#ca8a04',
  absent:  '#3f3f46',
  empty:   '#27272a',
  filled:  '#27272a',
}

export async function shareBoard(
  guesses: GuessRow[],
  wordLength: number,
  targetWord: string,
): Promise<void> {
  const cols = wordLength
  const rows = guesses.length

  const w = PAD * 2 + cols * TILE_SIZE + (cols - 1) * GAP
  const h = PAD * 2 + HEADER + rows * TILE_SIZE + (rows - 1) * GAP

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, w, h)

  // Title
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 28px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('LİNGO', w / 2, PAD + 20)

  // Subtitle (correct word)
  ctx.fillStyle = '#71717a'
  ctx.font = '13px system-ui, sans-serif'
  ctx.fillText(targetWord, w / 2, PAD + 46)

  // Tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = PAD + c * (TILE_SIZE + GAP)
      const y = PAD + HEADER + r * (TILE_SIZE + GAP)
      const letter = guesses[r]?.letters[c]
      const status = letter?.status ?? 'empty'

      ctx.fillStyle = COLOR[status] ?? COLOR.empty
      ctx.beginPath()
      ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, 6)
      ctx.fill()

      if (letter?.char) {
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${TILE_SIZE * 0.4}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letter.char, x + TILE_SIZE / 2, y + TILE_SIZE / 2)
      }
    }
  }

  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
  if (!blob) return

  const file = new File([blob], 'lingo.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'LİNGO' })
  } else {
    // Fallback: trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lingo.png'
    a.click()
    URL.revokeObjectURL(url)
  }
}
