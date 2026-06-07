import { useEffect } from 'react'
import { Routes, Route, useSearchParams, useParams, Navigate } from 'react-router-dom'
import { MultiplayerApp } from './components/multiplayer/MultiplayerApp'
import { LobbyPage } from './components/multiplayer/LobbyPage'
import { ChainApp } from './components/chain/ChainApp'
import { SoloGame } from './components/SoloGame'

declare const __APP_VERSION__: string

function LegacyRedirect() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('room')
  
  if (roomId) {
    return <Navigate to={`/room/${roomId}`} replace />
  }
  if (searchParams.has('lobby')) {
    return <Navigate to="/lobby" replace />
  }
  if (searchParams.has('passaparola') || searchParams.has('zincir')) {
    return <Navigate to="/zincir" replace />
  }
  
  return <SoloGame />
}

function MultiplayerWrapper() {
  const { roomId } = useParams<{ roomId: string }>()
  if (!roomId) return <Navigate to="/lobby" replace />
  return <MultiplayerApp roomId={roomId} />
}

export default function App() {
  useEffect(() => {
    console.info('Build Version:', __APP_VERSION__)
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <Routes>
        <Route path="/" element={<LegacyRedirect />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/zincir" element={<ChainApp />} />
        <Route path="/room/:roomId" element={<MultiplayerWrapper />} />
        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <span className="fixed bottom-2 right-2 text-[10px] text-white/30 pointer-events-none font-mono">
        v{__APP_VERSION__}
      </span>
    </div>
  )
}
