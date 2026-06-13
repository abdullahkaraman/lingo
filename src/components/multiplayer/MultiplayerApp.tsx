import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameHeader } from '../GameHeader'
import { MultiplayerEntry } from './MultiplayerEntry'
import { MultiplayerLobby } from './MultiplayerLobby'
import { MultiplayerGame } from './MultiplayerGame'
import { MultiplayerRoundResult } from './MultiplayerRoundResult'
import { SpectatorView } from './SpectatorView'
import { GoWebSocketClient } from '../../multiplayer/socket-client'
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
  const navigate = useNavigate()
  const [playerId] = useState(() => loadOrCreatePlayerId())
  const clientRef = useRef(new GoWebSocketClient())
  const client = clientRef.current

  const { state, error, connectionStatus, startGame, nextRound, setWordLength, setTimer, voteRematch, toggleSpectators } = useMultiplayerGame(client)

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
      // The Go backend keeps websocket role on the connection, so reconnect as a player
      // when this browser's persisted player id is already part of the room.
      const name = state.players[playerId].name || savedName
      client.send({ type: 'join', name })
      setPlayerName(name)
      joinedRef.current = true
    } else if (state.phase === 'waiting' && savedName) {
      // Waiting room + saved name → auto-join.
      client.send({ type: 'join', name: savedName })
      setPlayerName(savedName)
      joinedRef.current = true
    }
    // Active game + not a player → spectator, no join sent.
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
    if (!state.allowSpectators) {
      return (
        <div
          className="fixed inset-0 overflow-hidden text-white flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
        >
          <div className="text-center px-6 max-w-sm">
            <div className="text-4xl mb-4">🔒</div>
            <div className="text-lg font-bold mb-2">Bu oda özel</div>
            <div className="text-zinc-400 text-sm mb-6">Seyircilere kapalı bir oyun devam ediyor.</div>
            <button
              onClick={() => { navigate('/') }}
              className="px-6 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700
                text-zinc-300 font-semibold text-sm active:scale-95 transition-all"
            >
              ← Ana Sayfaya Dön
            </button>
          </div>
        </div>
      )
    }
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

        {!playerName && (phase === 'waiting' || !state) && (
          <MultiplayerEntry roomId={roomId} onJoin={handleJoin} />
        )}

        {playerName && !state && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Bağlanıyor…
          </div>
        )}

        {state && phase === 'waiting' && (
          <div className="w-full flex-1 overflow-y-auto min-h-0">
            <MultiplayerLobby
              state={state}
              myId={playerId}
              roomId={roomId}
              onStart={startGame}
              onSetWordLength={setWordLength}
              onSetTimer={setTimer}
              onToggleSpectators={toggleSpectators}
            />
          </div>
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
