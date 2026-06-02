import type { GuessRow, LetterStatus, PlayerBoard, RoomState } from './types'
import { evaluateGuess as evaluate } from '../utils/evaluateGuess'
import { isValidWord } from '../utils/dictionary'
import { normalize } from '../utils/normalizeTurkish'

export { evaluate as evaluateGuess }

export const MAX_ATTEMPTS = 5

const ATTEMPT_SCORES = [2000, 1600, 1200, 800, 400]

function buildRow(guess: string, statuses: LetterStatus[]): GuessRow {
  return {
    letters: guess.split('').map((char, i) => ({ char, status: statuses[i] })),
    submitted: true,
  }
}

const MAX_INVALID_PER_TURN = 4

export type ApplyGuessResult =
  | { ok: false; error: string; state?: RoomState }  // state present when a counter was updated
  | { ok: true; state: RoomState; won: boolean; roundOver: boolean }

// Shared helper: advance the turn after a board change (same logic used by skipTurn).
function advanceTurn(
  state: RoomState,
  playerId: string,
  newBoards: RoomState['boards'],
  roundOver: boolean,
): { phase: RoomState['phase']; currentTurn: string } {
  const isLastRound = state.round >= state.maxRounds
  const phase: RoomState['phase'] = roundOver
    ? isLastRound ? 'game_over' : 'round_over'
    : 'playing'

  let currentTurn = state.currentTurn
  if (!roundOver) {
    const otherStillGuessing = Object.keys(newBoards)
      .filter((id) => id !== playerId)
      .find((id) => newBoards[id].status === 'guessing')
    if (otherStillGuessing) currentTurn = otherStillGuessing
  }

  return { phase, currentTurn }
}

export function applyGuess(
  state: RoomState,
  playerId: string,
  rawGuess: string,
): ApplyGuessResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'Şu an aktif bir tur yok' }
  }
  if (state.currentTurn !== playerId) {
    return { ok: false, error: 'Sıra sende değil' }
  }

  const board = state.boards[playerId]
  if (!board || board.status !== 'guessing') {
    return { ok: false, error: 'Sıra sende değil' }
  }

  const guess = normalize(rawGuess)
  const target = state.targetWord

  if ([...guess].length !== state.wordLength) {
    return { ok: false, error: 'Kelime uzunluğu yanlış' }
  }
  if (guess[0] !== target[0]) {
    return { ok: false, error: 'Kelime verilen harfle başlamalı' }
  }

  // ── Duplicate check (doesn't consume an attempt or count as invalid) ────────
  const alreadySubmitted = board.rows
    .slice(0, board.currentRowIndex)
    .some((row) => row.submitted && row.letters.map((l) => l.char).join('') === guess)
  if (alreadySubmitted) {
    return { ok: false, error: 'Bu kelimeyi zaten denedin!' }
  }

  // ── Invalid word ────────────────────────────────────────────────────────────
  if (!isValidWord(guess)) {
    const newInvalidCount = (board.invalidCount ?? 0) + 1

    if (newInvalidCount > MAX_INVALID_PER_TURN) {
      // 5th invalid word: auto-skip the turn.
      const exhausted = board.currentRowIndex >= MAX_ATTEMPTS - 1
      const newBoard: PlayerBoard = {
        ...board,
        currentRowIndex: exhausted ? board.currentRowIndex : board.currentRowIndex + 1,
        status: exhausted ? 'lost' : 'guessing',
        invalidCount: 0,
      }
      const newBoards = { ...state.boards, [playerId]: newBoard }
      const roundOver = Object.values(newBoards).every((b) => b.status !== 'guessing')
      const { phase, currentTurn } = advanceTurn(state, playerId, newBoards, roundOver)
      return {
        ok: false,
        error: 'Çok fazla geçersiz kelime! Sıra rakibine geçti.',
        state: { ...state, phase, boards: newBoards, currentTurn },
      }
    }

    // Increment counter and return error.
    const remaining = MAX_INVALID_PER_TURN - newInvalidCount
    const newBoard: PlayerBoard = { ...board, invalidCount: newInvalidCount }
    return {
      ok: false,
      error: remaining > 0
        ? `Sözlükte yok! (${newInvalidCount}/${MAX_INVALID_PER_TURN})`
        : `Sözlükte yok! Bir daha geçersiz kelimede sıra geçer.`,
      state: { ...state, boards: { ...state.boards, [playerId]: newBoard } },
    }
  }

  // ── Valid guess ─────────────────────────────────────────────────────────────
  const statuses = evaluate(guess, target)
  const won = guess === target
  const exhausted = board.currentRowIndex >= MAX_ATTEMPTS - 1
  const newStatus: PlayerBoard['status'] = won ? 'won' : exhausted ? 'lost' : 'guessing'

  const newRows = [...board.rows]
  newRows[board.currentRowIndex] = buildRow(guess, statuses)

  const newBoard: PlayerBoard = {
    rows: newRows,
    currentRowIndex: won || exhausted ? board.currentRowIndex : board.currentRowIndex + 1,
    status: newStatus,
    invalidCount: 0,  // reset on every valid submission
  }

  const scoreGain = won ? (ATTEMPT_SCORES[board.currentRowIndex] ?? 0) : 0
  const newBoards = { ...state.boards, [playerId]: newBoard }
  const newPlayers = {
    ...state.players,
    [playerId]: { ...state.players[playerId], score: state.players[playerId].score + scoreGain },
  }

  const roundOver = won || Object.values(newBoards).every((b) => b.status !== 'guessing')
  const { phase, currentTurn } = advanceTurn(state, playerId, newBoards, roundOver)

  return {
    ok: true,
    state: { ...state, phase, players: newPlayers, boards: newBoards, currentTurn },
    won,
    roundOver,
  }
}
