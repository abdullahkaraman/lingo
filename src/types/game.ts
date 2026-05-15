export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'filled'

export interface Letter {
  char: string
  status: LetterStatus
}

export interface GuessRow {
  letters: Letter[]
  submitted: boolean
}

export type WordLength = 4 | 5 | 6 | 7

export type GamePhase = 'playing' | 'round_success' | 'round_failed'

// Why the round failed — drives modal copy and modal delay timing
export type FailReason = 'exhausted' | 'timeout' | 'invalid_word' | null

export interface GameState {
  wordLength: WordLength
  targetWord: string
  guesses: GuessRow[]
  currentGuessIndex: number
  currentInput: string
  phase: GamePhase
  score: number
  roundScore: number
  errorMessage: string | null
  timeLeft: number
  failReason: FailReason
  isFlashingRed: boolean
  wordsPlayed: number
  wordsGuessed: number
  isValidating: boolean   // true while awaiting TDK API response
}
