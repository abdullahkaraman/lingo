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

export type ApplyGuessResult =
  | { ok: false; error: string }
  | { ok: true; state: RoomState; won: boolean; roundOver: boolean }

export function applyGuess(
  state: RoomState,
  playerId: string,
  rawGuess: string,
): ApplyGuessResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'Round not in progress' }
  }

  const board = state.boards[playerId]
  if (!board || board.status !== 'guessing') {
    return { ok: false, error: 'Not your turn' }
  }

  const guess = normalize(rawGuess)
  const target = state.targetWord

  if ([...guess].length !== state.wordLength) {
    return { ok: false, error: 'Wrong word length' }
  }
  if (guess[0] !== target[0]) {
    return { ok: false, error: 'Guess must start with the revealed first letter' }
  }
  if (!isValidWord(guess)) {
    return { ok: false, error: 'Not a valid word' }
  }

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
  }

  const scoreGain = won ? (ATTEMPT_SCORES[board.currentRowIndex] ?? 0) : 0
  const newBoards = { ...state.boards, [playerId]: newBoard }
  const newPlayers = {
    ...state.players,
    [playerId]: {
      ...state.players[playerId],
      score: state.players[playerId].score + scoreGain,
    },
  }

  const roundOver = Object.values(newBoards).every((b) => b.status !== 'guessing')
  const isLastRound = state.round >= state.maxRounds
  const newPhase: RoomState['phase'] = roundOver
    ? isLastRound
      ? 'game_over'
      : 'round_over'
    : 'playing'

  return {
    ok: true,
    state: { ...state, phase: newPhase, players: newPlayers, boards: newBoards },
    won,
    roundOver,
  }
}
