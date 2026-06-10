import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, MultiplayerClient } from '../multiplayer/client'
import type { ServerEvent } from '../multiplayer/types'
import type { PublicState, SpectatorBoard, WordLength } from '../game-engine/types'

export interface MultiplayerGameActions {
  sendGuess: (word: string) => void
  startGame: () => void
  nextRound: () => void
  setWordLength: (wordLength: WordLength) => void
  setTimer: (timerSeconds: number) => void
  skipTurn: () => void
  voteRematch: () => void
  toggleSpectators: () => void
}

export interface GameError {
  message: string
  key: number // increments on every arrival so the same message re-triggers effects
}

function sanitizeSpectatorBoard(board: SpectatorBoard): SpectatorBoard {
  const rows = board.rows.filter((row) => row.submitted)
  return {
    ...board,
    rows,
    currentRowIndex: rows.length - 1,
  }
}

function sanitizeSpectatorState(state: PublicState): PublicState {
  if (!state.isSpectator || !state.spectatorBoards) return state

  const spectatorBoards = Object.fromEntries(
    Object.entries(state.spectatorBoards).map(([id, board]) => [
      id,
      sanitizeSpectatorBoard(board),
    ]),
  )

  return {
    ...state,
    spectatorBoards,
  }
}

export function useMultiplayerGame(client: MultiplayerClient): {
  state: PublicState | null
  error: GameError | null
  connectionStatus: ConnectionStatus
} & MultiplayerGameActions {
  const [state, setState] = useState<PublicState | null>(null)
  const [error, setError] = useState<GameError | null>(null)
  const errorKey = useRef(0)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    return client.subscribe((event: ServerEvent) => {
      if (event.type === 'state') {
        setState(sanitizeSpectatorState(event.state))
        setError(null)
      } else if (event.type === 'error') {
        setError({ message: event.message, key: ++errorKey.current })
      } else if (event.type === 'error_state') {
        setState(sanitizeSpectatorState(event.state))
        setError({ message: event.message, key: ++errorKey.current })
      }
    })
  }, [client])

  useEffect(() => {
    return client.onStatusChange(setConnectionStatus)
  }, [client])

  const sendGuess = useCallback(
    (word: string) => client.send({ type: 'guess', word }),
    [client],
  )

  const startGame = useCallback(
    () => client.send({ type: 'start_game' }),
    [client],
  )

  const nextRound = useCallback(
    () => client.send({ type: 'next_round' }),
    [client],
  )

  const setWordLength = useCallback(
    (wordLength: WordLength) => client.send({ type: 'set_word_length', wordLength }),
    [client],
  )

  const setTimer = useCallback(
    (timerSeconds: number) => client.send({ type: 'set_timer', timerSeconds }),
    [client],
  )

  const skipTurn = useCallback(
    () => client.send({ type: 'skip_turn' }),
    [client],
  )

  const voteRematch = useCallback(
    () => client.send({ type: 'rematch_vote' }),
    [client],
  )

  const toggleSpectators = useCallback(
    () => client.send({ type: 'toggle_spectators' }),
    [client],
  )

  return { state, error, connectionStatus, sendGuess, startGame, nextRound, setWordLength, setTimer, skipTurn, voteRematch, toggleSpectators }
}
