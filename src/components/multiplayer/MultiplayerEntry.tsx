import { useState } from 'react'

interface Props {
  roomId: string
  onJoin: (name: string) => void
}

export function MultiplayerEntry({ roomId, onJoin }: Props) {
  const [name, setName] = useState(() => localStorage.getItem('lingo_player_name') ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem('lingo_player_name', trimmed)
    onJoin(trimmed)
  }

  const roomCode = roomId.slice(0, 8).toUpperCase()

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">
      <div className="text-center">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Oda</div>
        <div className="text-2xl font-bold tracking-widest text-zinc-200">{roomCode}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white
            placeholder:text-zinc-500 text-center text-lg font-semibold
            focus:outline-none focus:border-yellow-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold text-lg
            disabled:opacity-40 active:scale-95 transition-all"
        >
          Odaya Katıl
        </button>
      </form>
    </div>
  )
}
