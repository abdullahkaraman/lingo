import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, MultiplayerClient } from '../multiplayer/client'
import type { ServerEvent } from '../multiplayer/types'
import type { PublicState, WordLength } from '../game-engine/types'

export interface MultiplayerGameActions {
  sendGuess: (word: string) => void
  startGame: () => void
  nextRound: () => void
  setWordLength: (wordLength: WordLength) => void
}

export interface GameError {
  message: string
  key: number // increments on every arrival so the same message re-triggers effects
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
        setState(event.state)
        setError(null)
      } else if (event.type === 'error') {
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

  return { state, error, connectionStatus, sendGuess, startGame, nextRound, setWordLength }
}
