import { create } from 'zustand'
import type { GameState, GuessRow, Letter, WordLength } from '../types/game'
import { evaluateGuess } from '../utils/evaluateGuess'
import { normalize } from '../utils/normalizeTurkish'
import { isValidWord } from '../utils/dictionary'
import tdkData from '../data/tdk-valid.json'

const WORD_LISTS = (tdkData as unknown as { game: Record<number, string[]> }).game

const ATTEMPT_SCORES = [2000, 1600, 1200, 800, 400]

export const MAX_ATTEMPTS = 5

const TIMER_DEFAULT = 12

// ── Row builders ────────────────────────────────────────────────────────────

function buildActiveRow(length: number, firstLetter: string): GuessRow {
  return {
    letters: Array.from({ length }, (_, i) => ({
      char: i === 0 ? firstLetter : '',
      status: i === 0 ? ('correct' as const) : ('empty' as const),
    })),
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
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    i === 0 ? buildActiveRow(wordLength, firstLetter) : buildBlankRow(wordLength),
  )
}

// ── Store interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  startNewWord: () => void
  setWordLength: (length: WordLength, timerMax?: number) => void
  typeChar: (char: string) => void
  deleteLast: () => void
  clearInput: () => void
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
  currentInput: '',
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
      currentInput: firstLetter,
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
    const { phase, wordLength, currentInput, currentGuessIndex, guesses, targetWord, isValidating } = get()
    if (phase !== 'playing' || isValidating) return
    if (currentInput.length >= wordLength) return

    const newInput = currentInput + normalize(char)
    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = row.letters.map((_, i) => {
        if (i === 0) return { char: targetWord[0], status: 'correct' as const }
        const ch = newInput[i] ?? ''
        return { char: ch, status: ch ? ('filled' as const) : ('empty' as const) }
      })
      return { ...row, letters }
    })

    set({ currentInput: newInput, guesses: updated, errorMessage: null })
  },

  deleteLast: () => {
    const { phase, currentInput, currentGuessIndex, guesses, targetWord, isValidating } = get()
    if (phase !== 'playing' || isValidating) return
    if (currentInput.length <= 1) return

    const newInput = currentInput.slice(0, -1)
    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = row.letters.map((_, i) => {
        if (i === 0) return { char: targetWord[0], status: 'correct' as const }
        const ch = newInput[i] ?? ''
        return { char: ch, status: ch ? ('filled' as const) : ('empty' as const) }
      })
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

    if ([...currentInput].length < wordLength) {
      set({ errorMessage: 'Kelimeyi tamamla!' })
      return
    }

    const guess = normalize(currentInput)
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
    const flipDuration = wordLength * 120 + 100

    setTimeout(() => {
      const { guesses: g, targetWord: t } = get()
      const nextGuesses = g.map((row, i) =>
        i === nextIdx ? buildActiveRow(wordLength, t[0]) : row,
      )
      set({
        guesses: nextGuesses,
        currentGuessIndex: nextIdx,
        currentInput: t[0],
        timeLeft: get().timerMax,
      })
    }, flipDuration)
  },

  clearInput: () => {
    const { phase, currentInput, currentGuessIndex, guesses, targetWord, isValidating } = get()
    if (phase !== 'playing' || isValidating || currentInput.length <= 1) return
    const updated = guesses.map((row, idx) => {
      if (idx !== currentGuessIndex) return row
      const letters: Letter[] = row.letters.map((_, i) => ({
        char: i === 0 ? targetWord[0] : '',
        status: i === 0 ? ('correct' as const) : ('empty' as const),
      }))
      return { ...row, letters }
    })
    set({ currentInput: targetWord[0], guesses: updated })
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
