import { GuessRow, LetterStatus, WordLength, PlayerBoard } from './types'
import { MAX_ATTEMPTS } from './constants'

/**
 * Extract confirmed (correct) letters from already-submitted rows.
 * Returns a map of position -> character.
 */
export function getConfirmedLetters(rows: GuessRow[], firstLetter?: string): Record<number, string> {
  const confirmed: Record<number, string> = {}
  if (firstLetter) {
    confirmed[0] = firstLetter
  }
  for (const row of rows) {
    if (!row.submitted) continue
    row.letters.forEach((l, i) => {
      if (l.status === 'correct' && l.char) {
        confirmed[i] = l.char
      }
    })
  }
  return confirmed
}

/**
 * Builds an array of characters for the current input, 
 * pre-filling positions that have been confirmed correct.
 */
export function buildInputArray(length: number, confirmed: Record<number, string>): string[] {
  return Array.from({ length }, (_, i) => confirmed[i] ?? '')
}

/**
 * Builds a single board row.
 * If 'confirmed' is provided, those positions are pre-filled as 'filled'.
 */
export function buildActiveRow(length: number, confirmed: Record<number, string>): GuessRow {
  return {
    letters: Array.from({ length }, (_, i) => {
      const char = confirmed[i] ?? ''
      return { char, status: (char ? 'filled' : 'empty') as LetterStatus }
    }),
    submitted: false,
  }
}

/**
 * Builds a single empty board row.
 */
export function buildBlankRow(length: number): GuessRow {
  return {
    letters: Array.from({ length }, () => ({ char: '', status: 'empty' as const })),
    submitted: false,
  }
}

/**
 * Creates a fresh board for a new round.
 */
export function emptyBoard(wordLength: WordLength, targetWord: string): PlayerBoard {
  const firstLetter = targetWord[0]
  const confirmed = { 0: firstLetter }
  
  return {
    rows: Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
      i === 0 ? buildActiveRow(wordLength, confirmed) : buildBlankRow(wordLength)
    ),
    currentRowIndex: 0,
    status: 'guessing',
    invalidCount: 0,
  }
}

/**
 * Initial board state for single player modes.
 */
export function buildInitialBoard(wordLength: WordLength, firstLetter: string): GuessRow[] {
  const confirmed = { 0: firstLetter }
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    i === 0 ? buildActiveRow(wordLength, confirmed) : buildBlankRow(wordLength)
  )
}

/**
 * Merges the locally-typed positional input into the server's board rows for display.
 * Active-row tiles are shown as 'filled'.
 */
export function withLocalInput(
  rows: GuessRow[],
  rowIndex: number,
  input: string[],
): GuessRow[] {
  return rows.map((row, i) => {
    if (i !== rowIndex || row.submitted) return row
    return {
      ...row,
      letters: input.map((char) => ({
        char,
        status: (char ? 'filled' : 'empty') as LetterStatus,
      })),
    }
  })
}
