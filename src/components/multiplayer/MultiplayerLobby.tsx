import { useState } from 'react'
import type { PublicState, WordLength } from '../../game-engine/types'

interface Props {
  state: PublicState
  myId: string
  roomId: string
  onStart: () => void
  onSetWordLength: (wl: WordLength) => void
  onSetTimer: (seconds: number) => void
  onToggleSpectators: () => void
}

const LENGTHS: WordLength[] = [4, 5, 6, 7]
const TIMER_OPTIONS = [0, 10, 15, 20, 25, 30]

export function MultiplayerLobby({ state, myId, roomId, onStart, onSetWordLength, onSetTimer, onToggleSpectators }: Props) {
  const [copied, setCopied] = useState(false)
  const isHost = state.players[myId]?.isHost
  const players = Object.values(state.players)
  const canStart = isHost && players.length >= 2

  const roomUrl = `${window.location.origin}/room/${roomId}`

  function handleCopy() {
    void navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-8 pb-8 w-full max-w-sm mx-auto">
      <div className="text-center">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Oda bağlantısını paylaş</div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-600
            text-zinc-300 text-sm font-mono hover:border-zinc-400 transition-colors active:scale-95"
        >
          <span className="truncate max-w-[200px]">{roomUrl}</span>
          <span className="shrink-0">{copied ? '✓' : '⎘'}</span>
        </button>
      </div>

      <div className="w-full">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Oyuncular</div>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700">
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.connected ? 'bg-green-400' : 'bg-zinc-600'}`} />
              <span className="font-semibold text-white flex-1">{p.name}</span>
              {p.isHost && <span className="text-xs text-yellow-400 font-mono">host</span>}
              {p.id === myId && <span className="text-xs text-zinc-500">(sen)</span>}
            </div>
          ))}
          {players.length < 2 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-dashed border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-zinc-700 shrink-0 animate-pulse" />
              <span className="text-zinc-500 text-sm">Rakip bekleniyor…</span>
            </div>
          )}
        </div>
      </div>

      {isHost && (
        <>
          <div className="w-full">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Kelime uzunluğu</div>
            <div className="flex gap-2">
              {LENGTHS.map((l) => (
                <button
                  key={l}
                  onClick={() => onSetWordLength(l)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                    state.wordLength === l
                      ? 'bg-yellow-500 border-yellow-400 text-black'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Tur süresi</div>
            <div className="flex gap-2">
              {TIMER_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => onSetTimer(t)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
                    (state.timerSeconds ?? 0) === t
                      ? 'bg-yellow-500 border-yellow-400 text-black'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {t === 0 ? 'Yok' : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Seyirci modu</div>
            <button
              onClick={onToggleSpectators}
              className={`w-full py-2.5 rounded-xl font-bold text-sm border transition-all active:scale-95 flex items-center justify-between px-4 ${
                state.allowSpectators
                  ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400'
              }`}
            >
              <span>{state.allowSpectators ? 'Açık — üçüncü kişiler izleyebilir' : 'Kapalı — sadece oyuncular girebilir'}</span>
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                state.allowSpectators ? 'bg-blue-400 border-blue-300' : 'bg-zinc-700 border-zinc-600'
              }`} />
            </button>
          </div>
        </>
      )}

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-lg
            disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          {canStart ? 'Oyunu Başlat' : 'Rakip bekleniyor…'}
        </button>
      ) : (
        <div className="text-zinc-500 text-sm text-center">Host oyunu başlatacak…</div>
      )}
    </div>
  )
}
