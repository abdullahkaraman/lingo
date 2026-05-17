import { create } from 'zustand'
import type { GameState, GuessRow, Letter, WordLength } from '../types/game'
import { evaluateGuess } from '../utils/evaluateGuess'
import { normalize } from '../utils/normalizeTurkish'
import { isValidWord } from '../utils/dictionary'
import { WORD_LISTS } from '../data/words'

const ATTEMPT_SCORES = [2000, 1600, 1200, 800, 400]

export const MAX_ATTEMPTS = 5

const TIMER_START = 12

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

function pickLocalWord(wordLength: WordLength): string {
  const list = (WORD_LISTS[wordLength] ?? []).filter(([w]) => [...w].length === wordLength)
  // Weight by sqrt(count) — favours common words without extreme skew from raw counts
  let total = 0
  const weights = list.map(([, count]) => { const w = Math.sqrt(count); total += w; return w })
  let r = Math.random() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i][0].toLocaleUpperCase('tr-TR')
  }
  return list[list.length - 1][0].toLocaleUpperCase('tr-TR')
}

function buildInitialBoard(wordLength: WordLength, firstLetter: string): GuessRow[] {
  return Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    i === 0 ? buildActiveRow(wordLength, firstLetter) : buildBlankRow(wordLength),
  )
}

// ── Store interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  startNewWord: () => void
  setWordLength: (length: WordLength) => void
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
  timeLeft: TIMER_START,
  failReason: null,
  isFlashingRed: false,
  wordsPlayed: 0,
  wordsGuessed: 0,
  isValidating: false,

  startNewWord: () => {
    const { wordLength, wordsPlayed } = get()

    // Pick a random word from the local TDK word list.
    // (The word-of-the-day API returned the same word every round for matching lengths.)
    const targetWord = pickLocalWord(wordLength)

    const firstLetter = targetWord[0]
    set({
      targetWord,
      guesses: buildInitialBoard(wordLength, firstLetter),
      currentGuessIndex: 0,
      currentInput: firstLetter,
      phase: 'playing',
      roundScore: 0,
      errorMessage: null,
      timeLeft: TIMER_START,
      failReason: null,
      isFlashingRed: false,
      isValidating: false,
      wordsPlayed: wordsPlayed + 1,
    })
  },

  setWordLength: (length: WordLength) => {
    set({ wordLength: length })
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

    // ── TDK dictionary validation (async, timer paused) ──────────────────
    set({ isValidating: true, errorMessage: null })
    const valid = await isValidWord(guess)
    set({ isValidating: false })

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
        timeLeft: TIMER_START,
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
    const { timeLeft, phase, isValidating } = get()
    // Pause timer while TDK validation is in flight so the player isn't penalised.
    if (phase !== 'playing' || isValidating) return
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
