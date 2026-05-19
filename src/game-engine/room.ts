import type {
  OpponentView,
  Player,
  PlayerBoard,
  PublicPlayer,
  PublicState,
  RoomState,
  WordLength,
} from './types'
import { MAX_ATTEMPTS } from './guess'
import { pickWord } from './word'

const MAX_PLAYERS = 2
const DEFAULT_MAX_ROUNDS = 5
const DEFAULT_WORD_LENGTH: WordLength = 5

function emptyBoard(wordLength: WordLength, targetWord: string): PlayerBoard {
  const firstLetter = targetWord[0]
  return {
    rows: Array.from({ length: MAX_ATTEMPTS }, (_, rowIdx) => ({
      letters: Array.from({ length: wordLength }, (_, colIdx) =>
        rowIdx === 0 && colIdx === 0
          ? { char: firstLetter, status: 'correct' as const }
          : { char: '', status: 'empty' as const },
      ),
      submitted: false,
    })),
    currentRowIndex: 0,
    status: 'guessing',
  }
}

export function createRoomState(
  roomId: string,
  hostId: string,
  wordLength: WordLength = DEFAULT_WORD_LENGTH,
  maxRounds: number = DEFAULT_MAX_ROUNDS,
): RoomState {
  const seed = roomId
  const targetWord = pickWord(wordLength, seed, 1)
  return {
    id: roomId,
    phase: 'waiting',
    hostId,
    players: {},
    boards: {},
    wordLength,
    targetWord,
    round: 1,
    maxRounds,
    seed,
    currentTurn: '',
    roundFirstPlayerId: hostId,
    gameFirstPlayerId: hostId,
    rematchCount: 0,
    rematchVotes: [],
  }
}

export function joinPlayer(state: RoomState, playerId: string, name: string): RoomState {
  const existing = state.players[playerId]
  const isNew = !existing
  if (isNew && Object.keys(state.players).length >= MAX_PLAYERS) return state

  const player: Player = isNew
    ? { id: playerId, name, score: 0, connected: true }
    : { ...existing, name, connected: true }

  const board = isNew ? emptyBoard(state.wordLength, state.targetWord) : state.boards[playerId]

  return {
    ...state,
    players: { ...state.players, [playerId]: player },
    boards: { ...state.boards, [playerId]: board },
  }
}

export function leavePlayer(state: RoomState, playerId: string): RoomState {
  if (!state.players[playerId]) return state
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], connected: false },
    },
  }
}

export function startGame(state: RoomState): RoomState {
  if (state.phase !== 'waiting') return state
  if (Object.keys(state.players).length < 2) return state
  return {
    ...state,
    phase: 'playing',
    currentTurn: state.roundFirstPlayerId,
    gameFirstPlayerId: state.roundFirstPlayerId,
  }
}

function startRematch(state: RoomState): RoomState {
  const rematchCount = state.rematchCount + 1
  // Use a distinct seed per rematch so words never repeat across games.
  const effectiveSeed = `${state.seed}-r${rematchCount}`

  // Swap who goes first: the player who started the previous game goes second now.
  const playerIds = Object.keys(state.players)
  const newFirst =
    playerIds.find((id) => id !== state.gameFirstPlayerId) ?? state.gameFirstPlayerId

  const targetWord = pickWord(state.wordLength, effectiveSeed, 1)

  const boards: Record<string, PlayerBoard> = {}
  for (const id of playerIds) {
    boards[id] = emptyBoard(state.wordLength, targetWord)
  }

  const players = { ...state.players }
  for (const id of playerIds) {
    players[id] = { ...players[id], score: 0 }
  }

  return {
    ...state,
    phase: 'playing',
    round: 1,
    seed: effectiveSeed,
    targetWord,
    boards,
    players,
    currentTurn: newFirst,
    roundFirstPlayerId: newFirst,
    gameFirstPlayerId: newFirst,
    rematchCount,
    rematchVotes: [],
  }
}

export function voteRematch(state: RoomState, playerId: string): RoomState {
  if (state.phase !== 'game_over') return state
  if (state.rematchVotes.includes(playerId)) return state

  const newVotes = [...state.rematchVotes, playerId]
  const connectedIds = Object.keys(state.players).filter((id) => state.players[id].connected)

  // All connected players have voted — start the rematch.
  if (connectedIds.every((id) => newVotes.includes(id))) {
    return startRematch({ ...state, rematchVotes: newVotes })
  }

  return { ...state, rematchVotes: newVotes }
}

export function startNextRound(state: RoomState): RoomState {
  if (state.phase !== 'round_over') return state
  const round = state.round + 1
  const targetWord = pickWord(state.wordLength, state.seed, round)
  const boards: Record<string, PlayerBoard> = {}
  for (const id of Object.keys(state.players)) {
    boards[id] = emptyBoard(state.wordLength, targetWord)
  }
  // Alternate who goes first each round.
  const playerIds = Object.keys(state.players)
  const nextFirst = playerIds.find((id) => id !== state.roundFirstPlayerId) ?? playerIds[0]
  return {
    ...state,
    phase: 'playing',
    round,
    targetWord,
    boards,
    roundFirstPlayerId: nextFirst,
    currentTurn: nextFirst,
  }
}

export function setWordLength(state: RoomState, wordLength: WordLength): RoomState {
  if (state.phase !== 'waiting') return state
  const savedPlayers = state.players
  const next = createRoomState(state.id, state.hostId, wordLength, state.maxRounds)
  // Re-add all players with their existing names and scores.
  let s = next
  for (const [id, p] of Object.entries(savedPlayers)) {
    s = joinPlayer(s, id, p.name)
    if (!p.connected) s = leavePlayer(s, id)
  }
  return s
}

export function getPublicState(state: RoomState, playerId: string): PublicState {
  const roundDone = state.phase === 'round_over' || state.phase === 'game_over'

  const players: Record<string, PublicPlayer> = {}
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = {
      id,
      name: p.name,
      score: p.score,
      isHost: id === state.hostId,
      connected: p.connected,
    }
  }

  const myBoard: PlayerBoard =
    state.boards[playerId] ?? emptyBoard(state.wordLength, state.targetWord)

  const opponents: Record<string, OpponentView> = {}
  for (const [id, board] of Object.entries(state.boards)) {
    if (id === playerId) continue
    opponents[id] = {
      submittedCount: board.rows.filter((r) => r.submitted).length,
      status: board.status,
      rows: roundDone ? board.rows : undefined,
    }
  }

  const opponentIds = Object.keys(state.players).filter((id) => id !== playerId)

  return {
    roomId: state.id,
    phase: state.phase,
    wordLength: state.wordLength,
    round: state.round,
    maxRounds: state.maxRounds,
    firstLetter: state.targetWord[0],
    targetWord: roundDone ? state.targetWord : undefined,
    currentTurn: state.currentTurn,
    isMyTurn: state.phase === 'playing' && state.currentTurn === playerId,
    players,
    myBoard,
    opponents,
    myVotedRematch: state.rematchVotes.includes(playerId),
    opponentVotedRematch: opponentIds.some((id) => state.rematchVotes.includes(id)),
  }
}
