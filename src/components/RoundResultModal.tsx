import { useEffect, useState } from 'react'
import type { FailReason, GamePhase } from '../types/game'

interface RoundResultModalProps {
  phase: GamePhase
  failReason: FailReason
  targetWord: string
  roundScore: number
  totalScore: number
  wordLength: number
  wordsPlayed: number
  wordsGuessed: number
  onNewWord: () => void
}

const FAIL_CONFIG: Record<NonNullable<FailReason>, { emoji: string; title: string; titleColor: string }> = {
  timeout:      { emoji: '⏱', title: 'SÜRE DOLDU!',      titleColor: 'text-orange-400' },
  invalid_word: { emoji: '🚫', title: 'GEÇERSİZ KELİME!', titleColor: 'text-red-400' },
  exhausted:    { emoji: '😔', title: 'ÜZGÜNÜM!',         titleColor: 'text-red-400' },
}

export function RoundResultModal({
  phase, failReason, targetWord, roundScore, totalScore,
  wordLength, wordsPlayed, wordsGuessed, onNewWord,
}: RoundResultModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (phase === 'round_success' || phase === 'round_failed') {
      // For exhausted/success: wait for the flip animation to finish.
      // For timeout/invalid_word: flash already finished before phase changed, short delay.
      const delay =
        phase === 'round_success' || failReason === 'exhausted'
          ? wordLength * 120 + 450
          : 250
      const t = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [phase, failReason, wordLength])

  if (!visible || (phase !== 'round_success' && phase !== 'round_failed')) {
    return null
  }

  const isSuccess = phase === 'round_success'
  const failCfg = failReason ? FAIL_CONFIG[failReason] : FAIL_CONFIG.exhausted

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={[
          'flex flex-col items-center gap-4 p-7 rounded-2xl border shadow-2xl max-w-sm w-full mx-4',
          'animate-bounceIn',
          isSuccess
            ? 'bg-gradient-to-b from-green-900/80 to-zinc-900 border-green-500/40'
            : 'bg-gradient-to-b from-red-900/50 to-zinc-900 border-red-500/30',
        ].join(' ')}
      >
        {isSuccess ? (
          <>
            <div className="text-5xl">🎉</div>
            <h2 className="text-3xl font-black text-green-400 tracking-wide">DOĞRU!</h2>
            <p className="text-white text-xl font-black tracking-[0.25em]">{targetWord}</p>
            <div className="flex flex-col items-center gap-1 bg-black/30 rounded-xl px-8 py-3 w-full">
              <span className="text-zinc-400 text-xs uppercase tracking-widest">Kazanılan Puan</span>
              <span className="text-green-400 text-4xl font-black">+{roundScore}</span>
              <span className="text-zinc-500 text-sm">Toplam: {totalScore}</span>
            </div>
            <Stats wordsPlayed={wordsPlayed} wordsGuessed={wordsGuessed} />
            <button
              onClick={onNewWord}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-black text-lg
                hover:bg-green-400 active:scale-95 transition-all duration-200 shadow-lg shadow-green-500/30"
            >
              YENİ KELİME →
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl">{failCfg.emoji}</div>
            <h2 className={`text-2xl font-black tracking-wide ${failCfg.titleColor}`}>{failCfg.title}</h2>
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 text-xs uppercase tracking-widest">Doğru kelime</span>
              <span className="text-white text-2xl font-black tracking-[0.3em] bg-zinc-800 px-5 py-2 rounded-xl border border-zinc-600">
                {targetWord}
              </span>
            </div>
            <Stats wordsPlayed={wordsPlayed} wordsGuessed={wordsGuessed} />
            <button
              onClick={onNewWord}
              className="w-full py-3 rounded-xl bg-zinc-600 text-white font-black text-lg
                hover:bg-zinc-500 active:scale-95 transition-all duration-200"
            >
              YENİ KELİME →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Stats({ wordsPlayed, wordsGuessed }: { wordsPlayed: number; wordsGuessed: number }) {
  return (
    <div className="flex gap-4 text-center w-full justify-center">
      <div className="flex flex-col items-center">
        <span className="text-white text-lg font-black">{wordsGuessed}</span>
        <span className="text-zinc-500 text-xs">Tahmin</span>
      </div>
      <div className="w-px bg-zinc-700" />
      <div className="flex flex-col items-center">
        <span className="text-white text-lg font-black">{wordsPlayed}</span>
        <span className="text-zinc-500 text-xs">Oynanan</span>
      </div>
      <div className="w-px bg-zinc-700" />
      <div className="flex flex-col items-center">
        <span className="text-white text-lg font-black">
          {wordsPlayed > 0 ? Math.round((wordsGuessed / wordsPlayed) * 100) : 0}%
        </span>
        <span className="text-zinc-500 text-xs">Başarı</span>
      </div>
    </div>
  )
}
