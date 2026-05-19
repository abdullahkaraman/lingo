import { useEffect, useRef, useState } from 'react'
import { GameHeader } from '../GameHeader'
import { MultiplayerEntry } from './MultiplayerEntry'
import { MultiplayerLobby } from './MultiplayerLobby'
import { MultiplayerGame } from './MultiplayerGame'
import { MultiplayerRoundResult } from './MultiplayerRoundResult'
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

  const { state, error, startGame, nextRound, setWordLength } = useMultiplayerGame(client)

  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('lingo_player_name') ?? '',
  )

  // Connect as soon as we have a name.
  useEffect(() => {
    if (!playerName) return
    client.connect(roomId, playerId, playerName)
    return () => client.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName])

  function handleJoin(name: string) {
    setPlayerName(name)
  }

  const phase = state?.phase

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <div className="w-full max-w-lg h-full flex flex-col items-center">
        <GameHeader onRestart={null} />

        {!playerName && (
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
            />
          </div>
        )}
      </div>
    </div>
  )
}
