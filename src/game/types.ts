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

export interface PlayerBoard {
  rows: GuessRow[]
  currentRowIndex: number
  status: 'guessing' | 'won' | 'lost'
  invalidCount: number // invalid-word submissions since last valid guess; resets on each valid guess
}
