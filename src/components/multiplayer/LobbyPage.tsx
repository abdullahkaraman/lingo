import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameHeader } from '../GameHeader'
import { API_URL } from '../../config/backend'

interface RoomInfo {
  id: string
  phase: string
  connectedCount: number
  playerNames: string[]
  wordLength: number
  timerSeconds: number
  allowSpectators: boolean
  updatedAt: number
}

const PHASE_LABEL: Record<string, { text: string; classes: string }> = {
  waiting:    { text: 'Bekleniyor',         classes: 'bg-green-900/50 text-green-400' },
  playing:    { text: 'Oyun devam ediyor',  classes: 'bg-yellow-900/50 text-yellow-400' },
  round_over: { text: 'Tur arası',          classes: 'bg-zinc-700 text-zinc-400' },
}

export function LobbyPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchRooms() {
      try {
        const response = await fetch(`${API_URL}/rooms`)
        if (!response.ok) throw new Error(`rooms request failed: ${response.status}`)
        const data = await response.json() as { rooms?: RoomInfo[] }
        if (!cancelled) {
          setRooms(data.rooms ?? [])
          setConnected(true)
        }
      } catch {
        if (!cancelled) setConnected(false)
      }
    }

    void fetchRooms()
    const interval = window.setInterval(fetchRooms, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const waitingRooms = rooms.filter((r) => r.phase === 'waiting')
  const activeRooms  = rooms.filter((r) => r.phase !== 'waiting')

  function createRoom() {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    navigate(`/room/${id}`)
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <div className="w-full max-w-lg h-full flex flex-col">
        <GameHeader onRestart={null} />

        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white text-sm transition-colors active:scale-95"
          >
            ← Geri
          </button>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            Aktif Odalar
          </span>
          <div
            title={connected ? 'Bağlandı' : 'Bağlanıyor…'}
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-zinc-600 animate-pulse'}`}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {!connected && (
            <p className="text-center text-zinc-500 text-sm mt-10">Bağlanıyor…</p>
          )}

          {connected && rooms.length === 0 && (
            <p className="text-center text-zinc-500 text-sm mt-10">
              Henüz aktif oda yok
            </p>
          )}

          {waitingRooms.length > 0 && (
            <>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">
                Katılmaya açık
              </div>
              {waitingRooms.map((r) => (
                <RoomCard key={r.id} room={r} canJoin navigate={navigate} />
              ))}
            </>
          )}

          {activeRooms.length > 0 && (
            <>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                Oyun devam ediyor
              </div>
              {activeRooms.map((r) => (
                <RoomCard key={r.id} room={r} canJoin={false} canWatch={r.allowSpectators} navigate={navigate} />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-zinc-800">
          <button
            onClick={createRoom}
            className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold text-lg
              active:scale-95 transition-all"
          >
            + Yeni Oda Oluştur
          </button>
        </div>
      </div>
    </div>
  )
}

function RoomCard({ room, canJoin, canWatch = true, navigate }: { room: RoomInfo; canJoin: boolean; canWatch?: boolean; navigate: (path: string) => void }) {
  const code  = room.id.slice(0, 8).toUpperCase()
  const timer = room.timerSeconds > 0 ? `${room.timerSeconds}s` : 'Süresiz'
  const badge = PHASE_LABEL[room.phase] ?? { text: room.phase, classes: 'bg-zinc-700 text-zinc-400' }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-white">{code}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.classes}`}>
            {badge.text}
          </span>
          {!canJoin && !canWatch && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-600 border border-zinc-700">
              🔒 Özel
            </span>
          )}
        </div>
        {/* Show player names only for joinable (waiting) rooms */}
        {canJoin && room.playerNames.length > 0 && (
          <div className="text-zinc-400 text-xs mt-0.5 truncate">{room.playerNames.join(', ')}</div>
        )}
        <div className="text-zinc-600 text-xs mt-0.5">
          {room.wordLength} harf · {timer} · {room.connectedCount}/2 oyuncu
        </div>
      </div>

      {canJoin ? (
        <button
          onClick={() => navigate(`/room/${room.id}`)}
          className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all bg-yellow-500 text-black"
        >
          Katıl
        </button>
      ) : canWatch ? (
        <button
          onClick={() => navigate(`/room/${room.id}`)}
          className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all bg-zinc-700 border border-zinc-600 text-zinc-300"
        >
          İzle
        </button>
      ) : null}
    </div>
  )
}
