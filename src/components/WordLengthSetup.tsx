import { useState } from 'react'
import type { WordLength } from '../game/types'

interface Option {
  length: WordLength
  difficulty: string
}

const OPTIONS: Option[] = [
  { length: 4, difficulty: 'Kolay' },
  { length: 5, difficulty: 'Orta' },
  { length: 6, difficulty: 'Zor' },
  { length: 7, difficulty: 'Çok Zor' },
]

const TIMER_MIN = 10
const TIMER_MAX = 20
const TIMER_DEFAULT = 12

interface WordLengthSetupProps {
  onSelect: (length: WordLength, timerSeconds: number) => void
  onBack?: () => void
  showTimer?: boolean
}

export function WordLengthSetup({ onSelect, onBack, showTimer = true }: WordLengthSetupProps) {
  const [timerSeconds, setTimerSeconds] = useState(TIMER_DEFAULT)

  const pct = ((timerSeconds - TIMER_MIN) / (TIMER_MAX - TIMER_MIN)) * 100

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full min-h-0 relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-0 left-0 p-4 text-zinc-400 hover:text-white transition-colors"
        >
          ← Geri
        </button>
      )}

      <div className="flex flex-col items-center gap-1">
        <h2 className="text-2xl font-black text-white tracking-wide">Kaç Harfli?</h2>
        <p className="text-zinc-400 text-sm">Kelime uzunluğunu seç ve oyuna başla</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {OPTIONS.map(({ length, difficulty }) => (
          <button
            key={length}
            onClick={() => onSelect(length, timerSeconds)}
            className="flex flex-col items-center justify-center gap-1 py-5 px-4 rounded-2xl
              bg-zinc-800 border-2 border-zinc-700 text-white
              hover:border-yellow-500/70 hover:bg-zinc-700 hover:shadow-lg hover:shadow-yellow-500/10
              active:scale-95 transition-all duration-200"
          >
            <span className="text-5xl font-black text-yellow-400 leading-none">{length}</span>
            <span className="text-sm font-bold text-white mt-1">{length} Harf</span>
            <span className="text-[11px] text-zinc-400">{difficulty}</span>
          </button>
        ))}
      </div>

      {/* Timer slider */}
      {showTimer && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Süre / Satır</span>
            <span className="text-yellow-400 font-black text-base tabular-nums">{timerSeconds}s</span>
          </div>

          <div className="relative h-2 w-full">
            {/* Track background */}
            <div className="absolute inset-0 rounded-full bg-zinc-700" />
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-yellow-400 transition-all duration-75"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={TIMER_MIN}
              max={TIMER_MAX}
              step={1}
              value={timerSeconds}
              onChange={e => setTimerSeconds(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>

          <div className="flex justify-between text-[11px] text-zinc-600">
            <span>{TIMER_MIN}s</span>
            <span>{TIMER_MAX}s</span>
          </div>
        </div>
      )}
    </div>
  )
}
