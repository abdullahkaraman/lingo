import type { PublicState, WordLength } from '../game-engine/types'

// ── Client → Server ───────────────────────────────────────────────────────────

export type ClientEvent =
  | { type: 'join'; name: string }
  | { type: 'start_game' }
  | { type: 'guess'; word: string }
  | { type: 'next_round' }
  | { type: 'set_word_length'; wordLength: WordLength }

// ── Server → Client ───────────────────────────────────────────────────────────

export type ServerEvent =
  | { type: 'state'; state: PublicState }
  | { type: 'error'; code: string; message: string }
