import { useEffect, useRef, useState } from 'react'
import { GameHeader } from '../GameHeader'
import { MultiplayerEntry } from './MultiplayerEntry'
import { MultiplayerLobby } from './MultiplayerLobby'
import { MultiplayerGame } from './MultiplayerGame'
import { MultiplayerRoundResult } from './MultiplayerRoundResult'
import { SpectatorView } from './SpectatorView'
import { PartyKitClient } from '../../multiplayer/partykit-client'
import { useMultiplayerGame } from '../../hooks/useMultiplayerGame'

function loadOrCreatePlayerId(): string {
  const key = 'lingo_player_id'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

interface Props {
  roomId: string
}

export function MultiplayerApp({ roomId }: Props) {
  const playerId = useRef(loadOrCreatePlayerId()).current
  const clientRef = useRef(new PartyKitClient())
  const client = clientRef.current

  const { state, error, connectionStatus, startGame, nextRound, setWordLength, setTimer, voteRematch } = useMultiplayerGame(client)

  const [playerName, setPlayerName] = useState('')
  const joinedRef = useRef(false)

  // Connect immediately — spectators can observe without a name.
  useEffect(() => {
    client.connect(roomId, playerId)
    return () => client.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once we receive state, auto-join if we're a known player or have a saved name in a waiting room.
  useEffect(() => {
    if (!state || joinedRef.current) return
    const savedName = localStorage.getItem('lingo_player_name') ?? ''

    if (state.players[playerId]) {
      // Server already reconnected us in onConnect — just sync the name.
      setPlayerName(state.players[playerId].name)
      joinedRef.current = true
    } else if (!state.isSpectator && savedName) {
      // Waiting room + saved name → auto-join.
      client.send({ type: 'join', name: savedName })
      setPlayerName(savedName)
      joinedRef.current = true
    }
    // Spectators (isSpectator === true) never send join.
  }, [state])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleJoin(name: string) {
    localStorage.setItem('lingo_player_name', name)
    client.send({ type: 'join', name })
    setPlayerName(name)
    joinedRef.current = true
  }

  const phase = state?.phase

  // Spectator: game already in progress, this connection is not a player.
  if (state?.isSpectator && phase !== 'waiting') {
    return <SpectatorView state={state} />
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <div className="w-full max-w-lg h-full flex flex-col items-center">
        <GameHeader onRestart={null} />

        {playerName && connectionStatus === 'disconnected' && (
          <div className="w-full px-3 mb-1">
            <div className="w-full px-4 py-2 rounded-xl bg-red-900/70 border border-red-700/50
              text-red-300 text-xs text-center font-semibold">
              Sunucuya bağlanılamıyor — yeniden deneniyor…
            </div>
          </div>
        )}

        {!playerName && !state?.isSpectator && (
          <MultiplayerEntry roomId={roomId} onJoin={handleJoin} />
        )}

        {playerName && !state && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Bağlanıyor…
          </div>
        )}

        {state && phase === 'waiting' && (
          <MultiplayerLobby
            state={state}
            myId={playerId}
            roomId={roomId}
            onStart={startGame}
            onSetWordLength={setWordLength}
            onSetTimer={setTimer}
          />
        )}

        {state && phase === 'playing' && (
          <MultiplayerGame
            state={state}
            myId={playerId}
            error={error}
            client={client}
          />
        )}

        {state && (phase === 'round_over' || phase === 'game_over') && (
          <div className="w-full flex-1 overflow-y-auto">
            <MultiplayerRoundResult
              state={state}
              myId={playerId}
              onNextRound={nextRound}
              onVoteRematch={voteRematch}
            />
          </div>
        )}
      </div>
    </div>
  )
}
