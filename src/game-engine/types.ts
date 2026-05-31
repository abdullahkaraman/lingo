// ── Primitives shared with the existing single-player code ───────────────────

export type WordLength = 4 | 5 | 6 | 7
export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'filled'

export interface Letter {
  char: string
  status: LetterStatus
}

export interface GuessRow {
  letters: Letter[]
  submitted: boolean
}

// ── Room-level types ──────────────────────────────────────────────────────────

export type RoomPhase = 'waiting' | 'playing' | 'round_over' | 'game_over'

export interface Player {
  id: string
  name: string
  score: number
  connected: boolean
}

export interface PlayerBoard {
  rows: GuessRow[]
  currentRowIndex: number
  status: 'guessing' | 'won' | 'lost'
}

// Full server-side state — targetWord is never sent to clients during play.
export interface RoomState {
  id: string
  phase: RoomPhase
  hostId: string
  players: Record<string, Player>
  boards: Record<string, PlayerBoard>
  wordLength: WordLength
  targetWord: string
  round: number
  maxRounds: number
  seed: string
  currentTurn: string        // playerId whose turn it is; '' when not playing
  roundFirstPlayerId: string // who went first this round (alternates each round)
  gameFirstPlayerId: string  // who went first in round 1 of this game (swaps on rematch)
  rematchCount: number       // 0 = original game, 1 = first rematch, …
  rematchVotes: string[]     // playerIds who have pressed "Rematch"
  timerSeconds: number       // seconds per turn; 0 = no timer
}

// ── Client-visible shapes ─────────────────────────────────────────────────────

export interface PublicPlayer {
  id: string
  name: string
  score: number
  isHost: boolean
  connected: boolean
}

// What the other player can see of your board during a round.
export interface OpponentView {
  submittedCount: number
  status: PlayerBoard['status']
  rows?: GuessRow[] // revealed only after round_over / game_over
}

// Full board info sent to spectators (both players' boards always visible)
export interface SpectatorBoard {
  rows: GuessRow[]
  currentRowIndex: number
  status: PlayerBoard['status']
  player: PublicPlayer
}

// Everything a client receives — no targetWord during play.
export interface PublicState {
  roomId: string
  phase: RoomPhase
  wordLength: WordLength
  round: number
  maxRounds: number
  firstLetter: string
  targetWord?: string  // present only when phase is round_over or game_over
  currentTurn: string  // playerId whose turn it is
  isMyTurn: boolean    // convenience: currentTurn === this client's id
  players: Record<string, PublicPlayer>
  myBoard: PlayerBoard
  opponents: Record<string, OpponentView>
  myVotedRematch: boolean       // has this client pressed Rematch?
  opponentVotedRematch: boolean // has the opponent pressed Rematch?
  timerSeconds: number          // seconds per turn; 0 = no timer
  isSpectator: boolean
  spectatorBoards?: Record<string, SpectatorBoard> // only present when isSpectator
}
