interface MobileActionBarProps {
  onDelete: () => void
  onMic: () => void
  onSubmit: () => void
  isListening: boolean
  speechSupported: boolean
  disabled: boolean
}

export function MobileActionBar({
  onDelete, onMic, onSubmit, isListening, speechSupported, disabled,
}: MobileActionBarProps) {
  return (
    <div className="md:hidden w-full flex gap-3 pb-5 mt-2">
      <button
        onPointerDown={(e) => { e.preventDefault(); onDelete() }}
        disabled={disabled}
        className="flex-1 py-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-2xl
          active:scale-95 transition-all duration-150 disabled:opacity-40 select-none"
      >
        ⌫
      </button>

      {speechSupported && (
        <button
          onPointerDown={(e) => { e.preventDefault(); onMic() }}
          disabled={disabled && !isListening}
          className={[
            'flex-1 py-4 rounded-2xl border text-2xl active:scale-95 transition-all duration-150 select-none',
            isListening
              ? 'bg-red-600 border-red-500 text-white animate-pulse'
              : 'bg-zinc-800 border-zinc-700 text-white disabled:opacity-40',
          ].join(' ')}
        >
          🎤
        </button>
      )}

      <button
        onPointerDown={(e) => { e.preventDefault(); onSubmit() }}
        disabled={disabled}
        className="flex-1 py-4 rounded-2xl bg-yellow-500 border border-yellow-400 text-zinc-900 text-2xl font-black
          active:scale-95 transition-all duration-150 disabled:opacity-40 select-none"
      >
        →
      </button>
    </div>
  )
}
