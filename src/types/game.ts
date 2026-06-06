import { LetterStatus, Letter, GuessRow, WordLength, GamePhase, FailReason } from '../game/types'

export type { LetterStatus, Letter, GuessRow, WordLength, GamePhase, FailReason }

export interface GameState {
  wordLength: WordLength
  targetWord: string
  guesses: GuessRow[]
  currentGuessIndex: number
  currentInput: string[]  // one slot per position; '' = empty, pre-filled for confirmed letters
  phase: GamePhase
  score: number
  roundScore: number
  errorMessage: string | null
  timerMax: number
  timeLeft: number
  failReason: FailReason
  isFlashingRed: boolean
  wordsPlayed: number
  wordsGuessed: number
  isValidating: boolean   // true while awaiting TDK API response
}
