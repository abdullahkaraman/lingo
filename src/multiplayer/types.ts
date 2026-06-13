import type { PublicState, WordLength } from '../game-engine/types'

// ── Client → Server ───────────────────────────────────────────────────────────

export type ClientEvent =
  | { type: 'join'; name: string }
  | { type: 'start_game' }
  | { type: 'guess'; word: string }
  | { type: 'next_round' }
  | { type: 'set_word_length'; wordLength: WordLength }
  | { type: 'set_timer'; timerSeconds: number }
  | { type: 'skip_turn' }
  | { type: 'ping' }
  | { type: 'rematch_vote' }
  | { type: 'toggle_spectators' }

// ── Server → Client ───────────────────────────────────────────────────────────

export type ServerEvent =
  | { type: 'state'; state: PublicState }
  | { type: 'error'; code: string; message: string }
  | { type: 'joined'; playerId: string; role: 'player' | 'spectator' }
  | { type: 'pong' }
  // Sent when a guess is invalid but state still changes (e.g. invalidCount bump, auto-skip).
  // Client must set both state and error without clearing one with the other.
  | { type: 'error_state'; code: string; message: string; state: PublicState }
