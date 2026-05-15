interface KeyboardProps {
  onKey: (key: string) => void
  onDelete: () => void
  onEnter: () => void
  letterStatuses: Record<string, string>
  isValidating: boolean
}

const ROW1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü']
const ROW2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ']
const ROW3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']

const STATUS_KEY_CLASSES: Record<string, string> = {
  correct: 'bg-green-600 border-green-500 text-white',
  present: 'bg-yellow-500 border-yellow-400 text-white',
  absent: 'bg-zinc-700 border-zinc-600 text-zinc-400',
  default: 'bg-zinc-600 border-zinc-500 text-white hover:bg-zinc-500',
}

export function Keyboard({ onKey, onDelete, onEnter, letterStatuses, isValidating }: KeyboardProps) {
  const getKeyClass = (key: string) => {
    const status = letterStatuses[key]
    return STATUS_KEY_CLASSES[status] ?? STATUS_KEY_CLASSES.default
  }

  const keyBtn = (key: string) => (
    <button
      key={key}
      onClick={() => onKey(key)}
      disabled={isValidating}
      className={`
        flex-1 min-w-0 py-3 rounded-lg border text-xs sm:text-sm font-bold
        active:scale-95 transition-all duration-100 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getKeyClass(key)}
      `}
    >
      {key}
    </button>
  )

  return (
    <div className="flex flex-col gap-1.5 items-center w-full max-w-lg mx-auto select-none">
      <div className="flex gap-1 justify-center w-full">
        {ROW1.map(keyBtn)}
      </div>

      <div className="flex gap-1 justify-center w-full">
        {ROW2.map(keyBtn)}
      </div>

      <div className="flex gap-1 justify-center w-full">
        <button
          onClick={onDelete}
          disabled={isValidating}
          className="px-3 py-3 rounded-lg border border-zinc-500 bg-zinc-600 text-white text-xs sm:text-sm font-bold
            active:scale-95 transition-all duration-100 cursor-pointer hover:bg-zinc-500 whitespace-nowrap
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⌫ SİL
        </button>

        {ROW3.map(keyBtn)}

        <button
          onClick={onEnter}
          disabled={isValidating}
          className="px-3 py-3 rounded-lg border border-yellow-500 bg-yellow-600 text-white text-xs sm:text-sm font-bold
            active:scale-95 transition-all duration-100 cursor-pointer hover:bg-yellow-500 whitespace-nowrap
            disabled:opacity-60 disabled:cursor-not-allowed min-w-[52px] flex items-center justify-center gap-1"
        >
          {isValidating
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'GİR ↵'}
        </button>
      </div>
    </div>
  )
}
