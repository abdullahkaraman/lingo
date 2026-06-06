import { useEffect } from 'react'
import { MultiplayerApp } from './components/multiplayer/MultiplayerApp'
import { LobbyPage } from './components/multiplayer/LobbyPage'
import { PassaparolaApp } from './components/passaparola/PassaparolaApp'
import { SoloGame } from './components/SoloGame'

declare const __APP_VERSION__: string

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('room')

  // ── Stamp build version into URL so local and phone can be compared ──────
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('v', __APP_VERSION__)
    history.replaceState(null, '', url.toString())
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      {roomId ? (
        <MultiplayerApp roomId={roomId} />
      ) : params.has('lobby') ? (
        <LobbyPage />
      ) : params.has('passaparola') ? (
        <PassaparolaApp />
      ) : (
        <SoloGame />
      )}
    </div>
  )
}
