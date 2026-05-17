import type { WordLength } from '../types/game'

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

interface WordLengthSetupProps {
  onSelect: (length: WordLength) => void
}

export function WordLengthSetup({ onSelect }: WordLengthSetupProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full min-h-0">
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-2xl font-black text-white tracking-wide">Kaç Harfli?</h2>
        <p className="text-zinc-400 text-sm">Kelime uzunluğunu seç ve oyuna başla</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {OPTIONS.map(({ length, difficulty }) => (
          <button
            key={length}
            onClick={() => onSelect(length)}
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
    </div>
  )
}
