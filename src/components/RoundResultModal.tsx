import { useEffect, useState } from 'react'
import type { FailReason, GamePhase, GuessRow } from '../types/game'
import { shareBoard } from '../utils/shareBoard'

interface RoundResultModalProps {
  phase: GamePhase
  failReason: FailReason
  targetWord: string
  roundScore: number
  totalScore: number
  wordLength: number
  wordsPlayed: number
  wordsGuessed: number
  guesses: GuessRow[]
  onNewWord: () => void
}

const FAIL_CONFIG: Record<NonNullable<FailReason>, { emoji: string; title: string; titleColor: string }> = {
  timeout:      { emoji: '⏱', title: 'SÜRE DOLDU!',      titleColor: 'text-orange-400' },
  invalid_word: { emoji: '🚫', title: 'GEÇERSİZ KELİME!', titleColor: 'text-red-400' },
  exhausted:    { emoji: '😔', title: 'ÜZGÜNÜM!',         titleColor: 'text-red-400' },
}

export function RoundResultModal({
  phase, failReason, targetWord, roundScore, totalScore,
  wordLength, wordsPlayed, wordsGuessed, guesses, onNewWord,
}: RoundResultModalProps) {
  const [visible, setVisible] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (phase === 'round_success' || phase === 'round_failed') {
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

  async function handleShare() {
    setSharing(true)
    try {
      await shareBoard(guesses, wordLength, targetWord)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
      {/* Inner sheet — constrained to game width on all screen sizes */}
      <div className="max-w-lg mx-auto">
        <div
          className={[
            'flex flex-col gap-3 px-5 pt-5 pb-8 rounded-t-2xl border-t border-x shadow-2xl',
            isSuccess
              ? 'bg-gradient-to-b from-green-950 to-zinc-950 border-green-700/40'
              : 'bg-gradient-to-b from-red-950 to-zinc-950 border-red-800/30',
          ].join(' ')}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isSuccess ? '🎉' : failCfg.emoji}</span>
              <span className={`text-lg font-black tracking-wide ${isSuccess ? 'text-green-400' : failCfg.titleColor}`}>
                {isSuccess ? 'DOĞRU!' : failCfg.title}
              </span>
            </div>
            {/* Correct word pill */}
            <span className="text-white font-black tracking-[0.2em] bg-zinc-800 px-4 py-1.5 rounded-xl border border-zinc-600 text-sm">
              {targetWord}
            </span>
          </div>

          {/* Score row (success only) */}
          {isSuccess && (
            <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2">
              <span className="text-zinc-400 text-xs uppercase tracking-widest flex-1">Kazanılan Puan</span>
              <span className="text-green-400 text-2xl font-black">+{roundScore}</span>
              <span className="text-zinc-500 text-sm">/ {totalScore} toplam</span>
            </div>
          )}

          {/* Stats row */}
          <Stats wordsPlayed={wordsPlayed} wordsGuessed={wordsGuessed} />

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Share button — shown on mobile (and desktop when Web Share is available) */}
            <button
              onClick={handleShare}
              disabled={sharing}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-zinc-700 border border-zinc-600 text-white font-bold text-sm
                active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {sharing ? '…' : '📸'}
            </button>

            <button
              onClick={onNewWord}
              className={[
                'flex-1 py-3 rounded-xl text-white font-black text-lg active:scale-95 transition-all duration-200',
                isSuccess
                  ? 'bg-green-500 hover:bg-green-400 shadow-lg shadow-green-500/30'
                  : 'bg-zinc-600 hover:bg-zinc-500',
              ].join(' ')}
            >
              YENİ KELİME →
            </button>
          </div>
        </div>
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
