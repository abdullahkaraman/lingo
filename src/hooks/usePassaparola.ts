import { create } from 'zustand'
import type { GuessRow, Letter, LetterStatus, WordLength } from '../types/game'
import { evaluateGuess } from '../utils/evaluateGuess'
import { normalize } from '../utils/normalizeTurkish'
import { isValidWord } from '../utils/dictionary'
import tdkData from '../data/tdk-valid.json'

// ── Alphabet ─────────────────────────────────────────────────────────────────

export const PASSAPAROLA_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'H', 'I', 'İ',
  'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş',
  'T', 'U', 'Ü', 'V', 'Y', 'Z',
] as const

// ── Constants ─────────────────────────────────────────────────────────────────

import { MAX_ATTEMPTS, ATTEMPT_SCORES, REVEAL_STAGGER_MS, REVEAL_END_DELAY_MS } from '../game/constants'
const MAX_INVALID_PER_LETTER = 4
const DEFAULT_WORD_LENGTH: WordLength = 5

const WORD_LISTS = (tdkData as unknown as { game: Record<number, string[]> }).game

// ── Used-word tracking (separate key from regular game) ───────────────────────

const usedKey = (len: WordLength) => `lingo_pp_used_${len}`

function loadUsed(len: WordLength): Set<string> {
  try {
    const raw = localStorage.getItem(usedKey(len))
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function markUsed(len: WordLength, word: string): void {
  try {
    const used = loadUsed(len)
    used.add(word)
    localStorage.setItem(usedKey(len), JSON.stringify([...used]))
  } catch {}
}

// ── Word picker ───────────────────────────────────────────────────────────────

function pickWordByLetter(letter: string, wordLength: WordLength): string {
  const used = loadUsed(wordLength)
  const all = (WORD_LISTS[wordLength] ?? []).map((w) => w.toLocaleUpperCase('tr-TR'))

  let candidates = all.filter((w) => w[0] === letter && !used.has(w))

  // If every word for this letter has been used before, reset and reuse.
  if (candidates.length === 0) {
    candidates = all.filter((w) => w[0] === letter)
  }

  if (candidates.length === 0) return letter // last resort, shouldn't happen
  if (candidates.length === 1) return candidates[0]

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ── Confirmed-letter helpers ──────────────────────────────────────────────────

function getConfirmedLetters(rows: GuessRow[]): Record<number, string> {
  const confirmed: Record<number, string> = {}
  for (const row of rows) {
    row.letters.forEach((l, i) => {
      if (l.status === 'correct' && l.char) confirmed[i] = l.char
    })
  }
  return confirmed
}

function buildInputArray(wordLength: WordLength, confirmed: Record<number, string>): string[] {
  return Array.from({ length: wordLength }, (_, i) => confirmed[i] ?? '')
}

// ── Board builders ────────────────────────────────────────────────────────────

function buildActiveRow(wordLength: WordLength, firstLetter: string): GuessRow {
  return {
    letters: Array.from({ length: wordLength }, (_, i) => ({
      char: i === 0 ? firstLetter : '',
      status: (i === 0 ? 'filled' : 'empty') as Letter['status'],
    })),
    submitted: false,
  }
}

function buildBlankRow(wordLength: WordLength): GuessRow {
  return {
    letters: Array.from({ length: wordLength }, () => ({ char: '', status: 'empty' as const })),
    submitted: false,
  }
}

function buildBoard(wordLength: WordLength, firstLetter: string): GuessRow[] {
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    i === 0 ? buildActiveRow(wordLength, firstLetter) : buildBlankRow(wordLength),
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LetterOutcome = 'unseen' | 'current' | 'skipped' | 'solved'

export type PassaparolaPhase =
  | 'idle'           // not yet started
  | 'playing'        // actively guessing current letter
  | 'round_won'      // letter just solved (show result before advancing)
  | 'round_skipped'  // letter just passed or exhausted (show result before advancing)
  | 'game_over'      // all letters resolved

export type SkipReason = 'passed' | 'exhausted' | null

export interface LetterResult {
  letter: string
  targetWord: string
  solved: boolean
  attempts: number   // 0 if passed immediately
  score: number
}

interface PassaparolaStore {
  phase: PassaparolaPhase
  wordLength: WordLength

  // ── Queue ──────────────────────────────────────────────────────────────────
  // Invariant: current letter is always queue[0].
  // Letters move: queue → (solved) gone | (skipped) → skipped[].
  // When queue empties: if skipped is non-empty, it becomes the new queue.
  // When both are empty: game_over.
  queue: string[]
  skipped: string[]
  outcomes: Record<string, LetterOutcome>

  // ── Board ──────────────────────────────────────────────────────────────────
  targetWord: string
  guesses: GuessRow[]
  currentGuessIndex: number
  currentInput: string[]  // one slot per position; '' = empty
  roundScore: number
  score: number
  skipReason: SkipReason
  errorMessage: string | null
  isFlashingRed: boolean

  // ── Accumulated results (populated as each letter is resolved) ─────────────
  results: LetterResult[]

  // ── Invalid word tracking ──────────────────────────────────────────────────
  invalidCount: number

  // ── Actions ────────────────────────────────────────────────────────────────
  startGame: (wordLength?: WordLength) => void
  typeChar: (char: string) => void
  deleteLast: () => void
  clearInput: () => void
  submitGuess: () => void
  passLetter: () => void  // voluntarily skip current letter
  advance: () => void     // call after round_won / round_skipped to proceed
  clearError: () => void
  resetGame: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildInitialOutcomes(): Record<string, LetterOutcome> {
  const o: Record<string, LetterOutcome> = {}
  for (const l of PASSAPAROLA_ALPHABET) o[l] = 'unseen'
  return o
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePassaparola = create<PassaparolaStore>((set, get) => ({
  phase: 'idle',
  wordLength: DEFAULT_WORD_LENGTH,
  queue: [],
  skipped: [],
  outcomes: buildInitialOutcomes(),
  targetWord: '',
  guesses: [],
  currentGuessIndex: 0,
  currentInput: [],
  roundScore: 0,
  score: 0,
  skipReason: null,
  errorMessage: null,
  isFlashingRed: false,
  results: [],
  invalidCount: 0,

  // ── startGame ──────────────────────────────────────────────────────────────

  startGame: (wordLength = DEFAULT_WORD_LENGTH) => {
    const queue = [...PASSAPAROLA_ALPHABET]
    const firstLetter = queue[0]
    const targetWord = pickWordByLetter(firstLetter, wordLength)
    markUsed(wordLength, targetWord)

    const outcomes = buildInitialOutcomes()
    outcomes[firstLetter] = 'current'

    set({
      phase: 'playing',
      wordLength,
      queue,
      skipped: [],
      outcomes,
      targetWord,
      guesses: buildBoard(wordLength, firstLetter),
      currentGuessIndex: 0,
      currentInput: buildInputArray(wordLength, { 0: firstLetter }),
      roundScore: 0,
      score: 0,
      skipReason: null,
      errorMessage: null,
      isFlashingRed: false,
      results: [],
      invalidCount: 0,
    })
  },

  // ── Input ──────────────────────────────────────────────────────────────────

  typeChar: (char: string) => {
    const { phase, currentInput, currentGuessIndex, guesses } = get()
    if (phase !== 'playing') return

    const nextPos = currentInput.findIndex((c, i) => c === '' && i !== 0)
    if (nextPos === -1) return

    const newInput = [...currentInput]
    newInput[nextPos] = normalize(char)

    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = newInput.map((ch) => ({
        char: ch,
        status: (ch ? 'filled' : 'empty') as Letter['status'],
      }))
      return { ...row, letters }
    })

    set({ currentInput: newInput, guesses: updated, errorMessage: null })
  },

  deleteLast: () => {
    const { phase, currentInput, currentGuessIndex, guesses } = get()
    if (phase !== 'playing') return

    let lastPos = -1
    for (let i = currentInput.length - 1; i >= 0; i--) {
      if (currentInput[i] !== '' && i !== 0) { lastPos = i; break }
    }
    if (lastPos === -1) return

    const newInput = [...currentInput]
    newInput[lastPos] = ''

    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = newInput.map((ch) => ({
        char: ch,
        status: (ch ? 'filled' : 'empty') as Letter['status'],
      }))
      return { ...row, letters }
    })

    set({ currentInput: newInput, guesses: updated })
  },

  clearInput: () => {
    const { phase, currentInput, currentGuessIndex, guesses } = get()
    if (phase !== 'playing') return

    const newInput = currentInput.map((c, i) => i === 0 ? c : '')
    if (newInput.every((c, i) => c === currentInput[i])) return

    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = newInput.map((ch) => ({
        char: ch,
        status: (ch ? 'filled' : 'empty') as Letter['status'],
      }))
      return { ...row, letters }
    })

    set({ currentInput: newInput, guesses: updated })
  },

  // ── submitGuess ────────────────────────────────────────────────────────────

  submitGuess: () => {
    const {
      phase, currentInput, wordLength, targetWord,
      guesses, currentGuessIndex, score, results, queue, invalidCount,
    } = get()

    if (phase !== 'playing') return

    if (currentInput.includes('')) {
      set({ errorMessage: 'Kelimeyi tamamla!' })
      return
    }

    const guess = normalize(currentInput.join(''))
    const target = normalize(targetWord)

    // Duplicate check
    const alreadyTried = guesses
      .slice(0, currentGuessIndex)
      .some((row) => row.submitted && row.letters.map((l) => l.char).join('') === guess)
    if (alreadyTried) {
      set({ errorMessage: 'Bu kelimeyi zaten denedin!' })
      return
    }

    if (!isValidWord(guess)) {
      const newInvalidCount = invalidCount + 1

      if (newInvalidCount > MAX_INVALID_PER_LETTER) {
        // 5th invalid: auto-pass the letter
        const currentLetter = queue[0]
        const newResult: LetterResult = {
          letter: currentLetter,
          targetWord,
          solved: false,
          attempts: currentGuessIndex,
          score: 0,
        }
        set({
          phase: 'round_skipped',
          skipReason: 'exhausted',
          results: [...results, newResult],
          invalidCount: 0,
          isFlashingRed: true,
          errorMessage: 'Çok fazla geçersiz kelime!',
        })
        setTimeout(() => set({ isFlashingRed: false }), 700)
        return
      }

      const remaining = MAX_INVALID_PER_LETTER - newInvalidCount
      set({
        invalidCount: newInvalidCount,
        isFlashingRed: true,
        errorMessage: remaining > 0
          ? `Sözlükte yok! (${newInvalidCount}/${MAX_INVALID_PER_LETTER})`
          : `Sözlükte yok! Bir daha geçersiz kelimede pas geçilir.`,
      })
      setTimeout(() => set({ isFlashingRed: false }), 700)
      return
    }

    const statuses = evaluateGuess(guess, target)
    const updatedLetters: Letter[] = statuses.map((status, i) => ({ char: guess[i], status }))
    const updatedGuesses = guesses.map((row, idx) =>
      idx === currentGuessIndex ? { ...row, letters: updatedLetters, submitted: true } : row,
    )

    const isCorrect = guess === target
    const isLastAttempt = currentGuessIndex === MAX_ATTEMPTS - 1

    if (isCorrect) {
      const roundScore = ATTEMPT_SCORES[currentGuessIndex] ?? 0
      const currentLetter = queue[0]
      const newResult: LetterResult = {
        letter: currentLetter,
        targetWord,
        solved: true,
        attempts: currentGuessIndex + 1,
        score: roundScore,
      }
      set({
        guesses: updatedGuesses,
        phase: 'round_won',
        roundScore,
        score: score + roundScore,
        skipReason: null,
        results: [...results, newResult],
        invalidCount: 0,
      })
      return
    }

    if (isLastAttempt) {
      // Exhausted all attempts — letter goes to skipped
      const currentLetter = queue[0]
      const newResult: LetterResult = {
        letter: currentLetter,
        targetWord,
        solved: false,
        attempts: MAX_ATTEMPTS,
        score: 0,
      }
      set({
        guesses: updatedGuesses,
        phase: 'round_skipped',
        skipReason: 'exhausted',
        results: [...results, newResult],
        invalidCount: 0,
      })
      return
    }

    // Wrong guess but more attempts remain — advance row
    set({ guesses: updatedGuesses, invalidCount: 0 })
    const nextIdx = currentGuessIndex + 1
    const flipDone = (wordLength - 1) * REVEAL_STAGGER_MS + REVEAL_END_DELAY_MS

    setTimeout(() => {
      const { guesses: g } = get()
      const confirmed = getConfirmedLetters(g)

      // Open the next row empty; animate confirmed letters in after the flip.
      const nextGuesses = g.map((row, i) =>
        i === nextIdx ? buildBlankRow(wordLength) : row,
      )
      set({
        guesses: nextGuesses,
        currentGuessIndex: nextIdx,
        currentInput: Array(wordLength).fill(''),
      })

      const entries = Object.entries(confirmed)
        .map(([k, v]) => [Number(k), v] as [number, string])
        .sort((a, b) => a[0] - b[0])

      entries.forEach(([pos, char], idx) => {
        setTimeout(() => {
          set((state) => {
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
            return { currentInput: newInput, guesses: newGuesses }
          })
        }, idx * 200)
      })
    }, flipDone)
  },

  // ── passLetter ─────────────────────────────────────────────────────────────

  passLetter: () => {
    const { phase, queue, targetWord, currentGuessIndex, results } = get()
    if (phase !== 'playing') return

    const currentLetter = queue[0]
    const newResult: LetterResult = {
      letter: currentLetter,
      targetWord,
      solved: false,
      attempts: currentGuessIndex, // how many guesses were submitted before passing
      score: 0,
    }

    set({
      phase: 'round_skipped',
      skipReason: 'passed',
      results: [...results, newResult],
    })
  },

  // ── advance ────────────────────────────────────────────────────────────────
  // Called after the round result is displayed to move to the next letter.

  advance: () => {
    const { phase, queue, skipped, outcomes, wordLength } = get()
    if (phase !== 'round_won' && phase !== 'round_skipped') return

    const currentLetter = queue[0]
    const solved = phase === 'round_won'

    // Update outcomes for the letter we just finished
    const newOutcomes = { ...outcomes, [currentLetter]: solved ? 'solved' : 'skipped' as LetterOutcome }

    // Build next queue and skipped list
    let nextQueue = queue.slice(1)
    let nextSkipped = solved ? skipped : [...skipped, currentLetter]

    // If queue is exhausted, start the next cycle with skipped letters
    if (nextQueue.length === 0) {
      if (nextSkipped.length === 0) {
        // All letters resolved — game over
        set({ phase: 'game_over', queue: [], skipped: [], outcomes: newOutcomes })
        return
      }
      nextQueue = nextSkipped
      nextSkipped = []
    }

    // Pick word for the next letter
    const nextLetter = nextQueue[0]
    const targetWord = pickWordByLetter(nextLetter, wordLength)
    markUsed(wordLength, targetWord)

    newOutcomes[nextLetter] = 'current'

    set({
      phase: 'playing',
      queue: nextQueue,
      skipped: nextSkipped,
      outcomes: newOutcomes,
      targetWord,
      guesses: buildBoard(wordLength, nextLetter),
      currentGuessIndex: 0,
      currentInput: buildInputArray(wordLength, { 0: nextLetter }),
      roundScore: 0,
      skipReason: null,
      errorMessage: null,
      isFlashingRed: false,
      invalidCount: 0,
    })
  },

  // ── Misc ───────────────────────────────────────────────────────────────────

  clearError: () => set({ errorMessage: null }),

  resetGame: () => set({
    phase: 'idle',
    queue: [],
    skipped: [],
    outcomes: buildInitialOutcomes(),
    targetWord: '',
    guesses: [],
    currentGuessIndex: 0,
    currentInput: [],
    roundScore: 0,
    score: 0,
    skipReason: null,
    errorMessage: null,
    isFlashingRed: false,
    results: [],
    invalidCount: 0,
  }),
}))
