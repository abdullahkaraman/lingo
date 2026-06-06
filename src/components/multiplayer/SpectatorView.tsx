import { useNavigate } from 'react-router-dom'
import { GameBoard } from '../GameBoard'
import { GameHeader } from '../GameHeader'
import type { PublicState } from '../../game-engine/types'

interface Props {
  state: PublicState
}

const PHASE_LABEL: Record<string, string> = {
  playing:    'Oyun devam ediyor',
  round_over: 'Tur bitti',
  game_over:  'Oyun bitti',
}

export function SpectatorView({ state }: Props) {
  const navigate = useNavigate()
  const { phase, round, maxRounds, targetWord, wordLength, spectatorBoards, players, currentTurn } = state
  const boards = Object.values(spectatorBoards ?? {}).map((b, i) => ({
    ...b,
    label: `Oyuncu ${i + 1}`,
  }))
  const isOver = phase === 'round_over' || phase === 'game_over'

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score)
  const winner = phase === 'game_over' && sortedPlayers.length > 1 && sortedPlayers[0].score > sortedPlayers[1].score
    ? sortedPlayers[0]
    : null

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <div className="w-full max-w-lg h-full flex flex-col">
        <GameHeader onRestart={null} />

        {/* Spectator banner */}
        <div className="mx-4 mt-2 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700
          text-center text-xs text-zinc-400 font-semibold tracking-wide">
          📺 İzleme Modu — {PHASE_LABEL[phase] ?? phase}
          {phase === 'playing' && (() => {
            const idx = boards.findIndex((b) => b.player.id === currentTurn)
            return idx !== -1 ? (
              <span className="ml-2 text-yellow-400">· Oyuncu {idx + 1} düşünüyor</span>
            ) : null
          })()}
        </div>

        {/* Scores */}
        <div className="flex justify-center gap-6 mt-3 px-4">
          {sortedPlayers.map((p, i) => {
            const boardIdx = boards.findIndex((b) => b.player.id === p.id)
            const label = boardIdx !== -1 ? `Oyuncu ${boardIdx + 1}` : `Oyuncu ${i + 1}`
            return (
            <div key={p.id} className={`text-center px-5 py-2 rounded-xl border ${
              i === 0 && phase === 'game_over'
                ? 'border-yellow-500/50 bg-yellow-900/20'
                : 'border-zinc-700 bg-zinc-800/50'
            }`}>
              <div className="text-xs text-zinc-400">{label}</div>
              <div className="text-2xl font-bold text-white">{p.score}</div>
              {i === 0 && winner?.id === p.id && (
                <div className="text-xs text-yellow-400">🏆 Kazanan</div>
              )}
            </div>
            )
          })}
        </div>

        {/* Round info */}
        <div className="text-center text-xs text-zinc-500 mt-1">
          {phase !== 'game_over' ? `Tur ${round}/${maxRounds}` : `${maxRounds} tur tamamlandı`}
        </div>

        {/* Target word (when revealed) */}
        {isOver && targetWord && (
          <div className="text-center mt-1 text-sm text-zinc-400">
            Kelime: <span className="text-white font-bold tracking-widest">{targetWord}</span>
          </div>
        )}

        {/* Both boards */}
        <div className="flex-1 overflow-y-auto px-4 mt-4">
          {boards.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm mt-10">Oyuncular bekleniyor…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full">
              {boards.map(({ rows, currentRowIndex, status, player, label }) => (
                <div key={player.id} className="min-w-0">
                  <div className="text-xs text-center mb-2 font-semibold truncate flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${player.connected ? 'bg-green-400' : 'bg-zinc-600'}`} />
                    <span className={
                      status === 'won' ? 'text-green-400' :
                      status === 'lost' ? 'text-red-400' :
                      currentTurn === player.id ? 'text-yellow-300' : 'text-zinc-400'
                    }>{label}</span>
                    {status === 'won' && <span>✓</span>}
                    {status === 'lost' && <span>✗</span>}
                    {currentTurn === player.id && status === 'guessing' && <span className="animate-pulse">●</span>}
                  </div>
                  <GameBoard
                    guesses={rows}
                    currentGuessIndex={currentRowIndex}
                    wordLength={wordLength}
                    shaking={false}
                    isFlashingRed={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-zinc-800 mt-3">
          <button
            onClick={() => { navigate('/') }}
            className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700
              text-zinc-400 font-semibold text-sm active:scale-95 transition-all"
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  )
}
