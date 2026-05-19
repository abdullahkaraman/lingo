import { GameBoard } from '../GameBoard'
import type { PublicState } from '../../game-engine/types'

interface Props {
  state: PublicState
  myId: string
  onNextRound: () => void
}

export function MultiplayerRoundResult({ state, myId, onNextRound }: Props) {
  const { phase, targetWord, players, myBoard, opponents, round, maxRounds } = state
  const isGameOver = phase === 'game_over'

  const myStatus = myBoard.status
  const opponentEntries = Object.entries(opponents)
  const opponentWon = opponentEntries.some(([, b]) => b.status === 'won')
  const iWon = myStatus === 'won'

  let resultLabel = ''
  let resultColor = 'text-zinc-300'
  if (iWon && !opponentWon) { resultLabel = '🎉 Kazandın!'; resultColor = 'text-green-400' }
  else if (!iWon && opponentWon) { resultLabel = 'Rakip kazandı'; resultColor = 'text-red-400' }
  else if (iWon && opponentWon) { resultLabel = 'Berabere!'; resultColor = 'text-yellow-400' }
  else { resultLabel = 'İkisi de bilemedi'; resultColor = 'text-zinc-400' }

  const playerList = Object.values(players).sort((a, b) => b.score - a.score)

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 w-full max-w-lg mx-auto overflow-y-auto">
      {/* Result header */}
      <div className="text-center">
        <div className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</div>
        {targetWord && (
          <div className="mt-1 text-zinc-400 text-sm">
            Kelime: <span className="text-white font-bold tracking-widest">{targetWord}</span>
          </div>
        )}
        <div className="mt-0.5 text-zinc-500 text-xs">
          {isGameOver ? 'Oyun bitti' : `${round}/${maxRounds}. tur`}
        </div>
      </div>

      {/* Scores */}
      <div className="flex gap-4 w-full justify-center">
        {playerList.map((p, i) => (
          <div key={p.id} className={`flex-1 max-w-[140px] py-3 px-4 rounded-xl text-center border ${
            i === 0 && isGameOver ? 'border-yellow-500/50 bg-yellow-900/20' : 'border-zinc-700 bg-zinc-800/60'
          }`}>
            <div className="text-xs text-zinc-400 truncate">{p.name}{p.id === myId ? ' (sen)' : ''}</div>
            <div className="text-2xl font-bold text-white mt-0.5">{p.score}</div>
            {i === 0 && isGameOver && playerList.length > 1 && playerList[0].score > playerList[1].score && (
              <div className="text-xs text-yellow-400 mt-0.5">🏆 Kazanan</div>
            )}
          </div>
        ))}
      </div>

      {/* Both boards side by side */}
      <div className="w-full">
        <div className="text-xs text-zinc-500 uppercase tracking-widest text-center mb-3">Tahminler</div>
        <div className="flex gap-3 justify-center items-start">
          {/* My board */}
          <div className="flex-1 max-w-[160px]">
            <div className="text-xs text-center text-zinc-400 mb-2 font-semibold">
              {players[myId]?.name ?? 'Sen'}
            </div>
            <GameBoard
              guesses={myBoard.rows}
              currentGuessIndex={myBoard.currentRowIndex}
              wordLength={state.wordLength}
              shaking={false}
              isFlashingRed={false}
            />
          </div>

          {/* Opponent boards */}
          {opponentEntries.map(([id, board]) => (
            <div key={id} className="flex-1 max-w-[160px]">
              <div className="text-xs text-center text-zinc-400 mb-2 font-semibold">
                {players[id]?.name ?? 'Rakip'}
              </div>
              {board.rows ? (
                <GameBoard
                  guesses={board.rows}
                  currentGuessIndex={board.submittedCount - 1}
                  wordLength={state.wordLength}
                  shaking={false}
                  isFlashingRed={false}
                />
              ) : (
                <div className="text-zinc-600 text-xs text-center">—</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      {isGameOver ? (
        <a
          href={window.location.pathname}
          className="w-full py-3 rounded-xl bg-zinc-700 text-white font-bold text-center
            active:scale-95 transition-all block"
        >
          Ana Sayfaya Dön
        </a>
      ) : (
        <button
          onClick={onNextRound}
          className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold text-lg
            active:scale-95 transition-all"
        >
          Sonraki Tur →
        </button>
      )}
    </div>
  )
}
