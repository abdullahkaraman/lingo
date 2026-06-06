import { Link } from 'react-router-dom'

interface GameHeaderProps {
  onRestart: (() => void) | null
}

export function GameHeader({ onRestart }: GameHeaderProps) {
  return (
    <header className="w-full flex items-center justify-between py-3 border-b border-zinc-700/50 mb-2">
      <div className="w-10" /> {/* spacer */}
      <Link to="/" className="flex flex-col items-center gap-0.5 group">
        <h1
          className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-transparent bg-clip-text
            bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400
            drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]
            group-hover:drop-shadow-[0_0_28px_rgba(234,179,8,0.9)] transition-all duration-200"
        >
          LİNGO
        </h1>
        <p className="text-zinc-500 text-[10px] tracking-widest uppercase">Kelime Tahmin Oyunu</p>
      </Link>
      {onRestart ? (
        <button
          onClick={onRestart}
          title="Ana menüye dön"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700
            text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors duration-200 text-lg"
        >
          ↺
        </button>
      ) : (
        <div className="w-10" />
      )}
    </header>
  )
}
