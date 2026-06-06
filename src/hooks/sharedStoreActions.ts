import { normalize } from '../utils/normalizeTurkish'
import type { Letter, LetterStatus, GuessRow } from '../game/types'

interface SharedStoreState {
  phase: string
  currentInput: string[]
  currentGuessIndex: number
  guesses: GuessRow[]
  isValidating?: boolean
  errorMessage: string | null
}

export function createInputActions<T extends SharedStoreState>(
  set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
  get: () => T,
) {
  return {
    typeChar: (char: string) => {
      const { phase, currentInput, currentGuessIndex, guesses, isValidating } = get()
      if (phase !== 'playing' || isValidating) return

      const nextPos = currentInput.findIndex((c, i) => c === '' && i !== 0)
      if (nextPos === -1) return

      const newInput = [...currentInput]
      newInput[nextPos] = normalize(char)

      const updated = guesses.map((row, idx) => {
        if (idx !== currentGuessIndex) return row
        const letters: Letter[] = newInput.map((ch) => ({
          char: ch,
          status: (ch ? 'filled' : 'empty') as LetterStatus,
        }))
        return { ...row, letters }
      })

      set({ 
        currentInput: newInput, 
        guesses: updated, 
        errorMessage: null 
      } as Partial<T>)
    },

    deleteLast: () => {
      const { phase, currentInput, currentGuessIndex, guesses, isValidating } = get()
      if (phase !== 'playing' || isValidating) return

      let lastPos = -1
      for (let i = currentInput.length - 1; i >= 0; i--) {
        if (currentInput[i] !== '' && i !== 0) {
          lastPos = i
          break
        }
      }
      if (lastPos === -1) return

      const newInput = [...currentInput]
      newInput[lastPos] = ''

      const updated = guesses.map((row, idx) => {
        if (idx !== currentGuessIndex) return row
        const letters: Letter[] = newInput.map((ch) => ({
          char: ch,
          status: (ch ? 'filled' : 'empty') as LetterStatus,
        }))
        return { ...row, letters }
      })

      set({ 
        currentInput: newInput, 
        guesses: updated 
      } as Partial<T>)
    },

    clearInput: () => {
      const { phase, currentInput, currentGuessIndex, guesses, isValidating } = get()
      if (phase !== 'playing' || isValidating) return

      const newInput = currentInput.map((c, i) => (i === 0 ? c : ''))
      if (newInput.every((c, i) => c === currentInput[i])) return

      const updated = guesses.map((row, idx) => {
        if (idx !== currentGuessIndex) return row
        const letters: Letter[] = newInput.map((ch) => ({
          char: ch,
          status: (ch ? 'filled' : 'empty') as LetterStatus,
        }))
        return { ...row, letters }
      })

      set({ 
        currentInput: newInput, 
        guesses: updated 
      } as Partial<T>)
    },
  }
}

/**
 * Shared logic for staggered pre-filling of confirmed letters in a new row
 */
export function animateConfirmedLetters<T extends SharedStoreState>(
  set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
  nextIdx: number,
  confirmed: Record<number, string>,
) {
  const entries = Object.entries(confirmed)
    .map(([k, v]) => [Number(k), v] as [number, string])
    .sort((a, b) => a[0] - b[0])

  entries.forEach(([pos, char], idx) => {
    setTimeout(() => {
      set((state) => {
        // Ensure we are still in the same round and position
        if (state.phase !== 'playing' || state.currentGuessIndex !== nextIdx) return {}
        
        const newInput = [...state.currentInput]
        newInput[pos] = char
        
        const newGuesses = state.guesses.map((row, i) => {
          if (i !== nextIdx) return row
          const letters: Letter[] = newInput.map((ch) => ({
            char: ch,
            status: (ch ? 'filled' : 'empty') as LetterStatus,
          }))
          return { ...row, letters }
        })

        return { 
          currentInput: newInput, 
          guesses: newGuesses 
        } as Partial<T>
      })
    }, idx * 200)
  })
}
