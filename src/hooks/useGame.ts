import { create } from 'zustand'
import type { GameState, GuessRow, Letter, LetterStatus, WordLength } from '../types/game'
import { evaluateGuess } from '../utils/evaluateGuess'
import { normalize } from '../utils/normalizeTurkish'
import { isValidWord } from '../utils/dictionary'
import tdkData from '../data/tdk-valid.json'

const WORD_LISTS = (tdkData as unknown as { game: Record<number, string[]> }).game

import { MAX_ATTEMPTS, ATTEMPT_SCORES, REVEAL_STAGGER_MS, REVEAL_END_DELAY_MS } from '../game/constants'

const TIMER_DEFAULT = 12

// ── Confirmed-letter helpers ─────────────────────────────────────────────────

function getConfirmedLetters(rows: GuessRow[]): Record<number, string> {
  const confirmed: Record<number, string> = {}
  for (const row of rows) {
    row.letters.forEach((l, i) => {
      if (l.status === 'correct' && l.char) confirmed[i] = l.char
    })
  }
  return confirmed
}

function buildInputArray(length: number, confirmed: Record<number, string>): string[] {
  return Array.from({ length }, (_, i) => confirmed[i] ?? '')
}

// ── Row builders ────────────────────────────────────────────────────────────

function buildActiveRow(length: number, confirmed: Record<number, string>): GuessRow {
  return {
    letters: Array.from({ length }, (_, i) => {
      const char = confirmed[i] ?? ''
      return { char, status: (char ? 'filled' : 'empty') as LetterStatus }
    }),
    submitted: false,
  }
}

function buildBlankRow(length: number): GuessRow {
  return {
    letters: Array.from({ length }, () => ({ char: '', status: 'empty' as const })),
    submitted: false,
  }
}

// ── Per-device word history ──────────────────────────────────────────────────

const usedKey = (len: WordLength) => `lingo_used_${len}`

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

function pickLocalWord(wordLength: WordLength, wordsPlayed: number): string {
  const used = loadUsed(wordLength)
  let candidates = (WORD_LISTS[wordLength] ?? []).filter(
    (w) => !used.has(w.toLocaleUpperCase('tr-TR')),
  )

  if (candidates.length === 0) {
    localStorage.removeItem(usedKey(wordLength))
    candidates = WORD_LISTS[wordLength] ?? []
  }

  if (candidates.length === 1) return candidates[0].toLocaleUpperCase('tr-TR')

  // Words are sorted most-to-least common by the fetch script.
  // A Laplace distribution peaks at `focal`, which slides from index 0 (easiest)
  // to index n-1 (hardest) as difficulty increases every 20 words (max level 10).
  const MAX_DIFFICULTY = 10
  const difficulty = Math.min(Math.floor(wordsPlayed / 20), MAX_DIFFICULTY)
  const n = candidates.length
  const focal = (difficulty / MAX_DIFFICULTY) * (n - 1)
  const tau = (n - 1) / Math.log(20)

  let totalWeight = 0
  const weights = candidates.map((_, i) => {
    const w = Math.exp(-Math.abs(i - focal) / tau)
    totalWeight += w
    return w
  })
  let r = Math.random() * totalWeight
  let word = candidates[0]
  for (let i = 0; i < n; i++) {
    r -= weights[i]
    if (r <= 0) { word = candidates[i]; break }
  }
  return word.toLocaleUpperCase('tr-TR')
}

function buildInitialBoard(wordLength: WordLength, firstLetter: string): GuessRow[] {
  const confirmed = { 0: firstLetter }
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    i === 0 ? buildActiveRow(wordLength, confirmed) : buildBlankRow(wordLength),
  )
}

// ── Store interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  startNewWord: () => void
  setWordLength: (length: WordLength, timerMax?: number) => void
  typeChar: (char: string) => void
  deleteLast: () => void
  clearInput: () => void
  setVoiceInput: (word: string) => void
  submitGuess: () => Promise<void>
  clearError: () => void
  tickTimer: () => void
  resetGame: () => void
}

export const useGame = create<GameStore>((set, get) => ({
  wordLength: 4,
  targetWord: '',
  guesses: [],
  currentGuessIndex: 0,
  currentInput: [],
  phase: 'playing',
  score: 0,
  roundScore: 0,
  errorMessage: null,
  timerMax: TIMER_DEFAULT,
  timeLeft: TIMER_DEFAULT,
  failReason: null,
  isFlashingRed: false,
  wordsPlayed: 0,
  wordsGuessed: 0,
  isValidating: false,

  startNewWord: () => {
    const { wordLength, wordsPlayed, timerMax } = get()

    const targetWord = pickLocalWord(wordLength, wordsPlayed)
    markUsed(wordLength, targetWord)

    const firstLetter = targetWord[0]
    set({
      targetWord,
      guesses: buildInitialBoard(wordLength, firstLetter),
      currentGuessIndex: 0,
      currentInput: buildInputArray(wordLength, { 0: firstLetter }),
      phase: 'playing',
      roundScore: 0,
      errorMessage: null,
      timeLeft: timerMax,
      failReason: null,
      isFlashingRed: false,
      isValidating: false,
      wordsPlayed: wordsPlayed + 1,
    })
  },

  setWordLength: (length: WordLength, timerMax = TIMER_DEFAULT) => {
    set({ wordLength: length, timerMax })
    get().startNewWord()
  },

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
        status: (ch ? 'filled' : 'empty') as Letter['status'],
      }))
      return { ...row, letters }
    })

    set({ currentInput: newInput, guesses: updated, errorMessage: null })
  },

  deleteLast: () => {
    const { phase, currentInput, currentGuessIndex, guesses, isValidating } = get()
    if (phase !== 'playing' || isValidating) return

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

  submitGuess: async () => {
    const {
      phase, currentInput, wordLength, targetWord,
      guesses, currentGuessIndex, score, wordsGuessed, isValidating,
    } = get()

    if (phase !== 'playing' || isValidating) return

    if (currentInput.includes('')) {
      set({ errorMessage: 'Kelimeyi tamamla!' })
      return
    }

    const guess = normalize(currentInput.join(''))
    const target = normalize(targetWord)

    // ── Duplicate guess check ─────────────────────────────────────────────
    const alreadyTried = guesses
      .slice(0, currentGuessIndex)
      .some((row) => row.submitted && row.letters.map((l) => l.char).join('') === guess)
    if (alreadyTried) {
      set({ errorMessage: 'Bu kelimeyi zaten denedin!' })
      return
    }

    // ── Local dictionary validation (offline-safe) ────────────────────────
    const valid = isValidWord(guess)

    if (!valid) {
      const markedAbsent = guesses.map((row, idx) =>
        idx === currentGuessIndex
          ? { ...row, letters: row.letters.map((l) => ({ ...l, status: 'absent' as const })), submitted: true }
          : row,
      )
      set({ guesses: markedAbsent, isFlashingRed: true, errorMessage: 'Bu kelime sözlükte yok!' })
      setTimeout(() => {
        set({ isFlashingRed: false, phase: 'round_failed', failReason: 'invalid_word' })
      }, 700)
      return
    }

    // ── Evaluate ──────────────────────────────────────────────────────────
    const statuses = evaluateGuess(guess, target)
    const updatedLetters: Letter[] = statuses.map((status, i) => ({ char: guess[i], status }))
    const updatedGuesses = guesses.map((row, idx) =>
      idx === currentGuessIndex ? { ...row, letters: updatedLetters, submitted: true } : row,
    )

    const isCorrect = guess === target
    const isLastAttempt = currentGuessIndex === MAX_ATTEMPTS - 1

    if (isCorrect) {
      const roundScore = ATTEMPT_SCORES[currentGuessIndex] ?? 0
      set({
        guesses: updatedGuesses,
        phase: 'round_success',
        score: score + roundScore,
        roundScore,
        failReason: null,
        wordsGuessed: wordsGuessed + 1,
      })
      return
    }

    if (isLastAttempt) {
      set({ guesses: updatedGuesses, phase: 'round_failed', failReason: 'exhausted' })
      return
    }

    // ── Wrong but more attempts remain — flip, then reveal next row ───────
    set({ guesses: updatedGuesses })
    const nextIdx = currentGuessIndex + 1

    // Actual flip completes when the last tile finishes: (wordLength-1)*REVEAL_STAGGER_MS + REVEAL_END_DELAY_MS ms.
    const actualFlipDone = (wordLength - 1) * REVEAL_STAGGER_MS + REVEAL_END_DELAY_MS

    setTimeout(() => {
      const { guesses: g } = get()
      const confirmed = getConfirmedLetters(g)

      // Open the next row with no pre-fills; animate them in after the flip.
      const nextGuesses = g.map((row, i) =>
        i === nextIdx ? buildActiveRow(wordLength, {}) : row,
      )
      set({
        guesses: nextGuesses,
        currentGuessIndex: nextIdx,
        currentInput: buildInputArray(wordLength, {}),
        timeLeft: get().timerMax,
      })

      const entries = Object.entries(confirmed)
        .map(([k, v]) => [Number(k), v] as [number, string])
        .sort((a, b) => a[0] - b[0])

      entries.forEach(([pos, char], idx) => {
        setTimeout(() => {
          set((state) => {
            if (state.currentGuessIndex !== nextIdx) return {}
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
    }, actualFlipDone)
  },

  clearInput: () => {
    const { phase, currentInput, currentGuessIndex, guesses, isValidating } = get()
    if (phase !== 'playing' || isValidating) return

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

  setVoiceInput: (word: string) => {
    const { phase, wordLength, currentGuessIndex, guesses, isValidating } = get()
    if (phase !== 'playing' || isValidating) return
    const normalized = normalize(word)
    if ([...normalized].length !== wordLength) return

    const firstLetter = getConfirmedLetters(guesses)[0] ?? ''
    const newInput: string[] = Array.from({ length: wordLength }, (_, i) =>
      i === 0 ? firstLetter : (normalized[i] ?? ''),
    )

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

  clearError: () => set({ errorMessage: null }),

  tickTimer: () => {
    const { timeLeft, phase } = get()
    if (phase !== 'playing') return
    if (timeLeft <= 1) {
      set({ isFlashingRed: true, timeLeft: 0 })
      setTimeout(() => {
        set({ isFlashingRed: false, phase: 'round_failed', failReason: 'timeout' })
      }, 700)
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  resetGame: () => {
    set({ score: 0, wordsPlayed: 0, wordsGuessed: 0 })
  },
}))
