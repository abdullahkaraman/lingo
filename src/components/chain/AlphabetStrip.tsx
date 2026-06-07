import type { LetterOutcome } from '../../hooks/useChain'
import { CHAIN_ALPHABET } from '../../hooks/useChain'

interface Props {
  outcomes: Record<string, LetterOutcome>
}

const CHIP: Record<LetterOutcome, string> = {
  unseen:  'bg-zinc-800 text-zinc-500 border border-zinc-700',
  current: 'bg-yellow-400 text-black font-bold scale-110 shadow-lg shadow-yellow-500/30 border border-yellow-300',
  skipped: 'bg-orange-500 text-black font-bold border border-orange-400',
  solved:  'bg-green-600 text-white border border-green-500',
}

export function AlphabetStrip({ outcomes }: Props) {
  return (
    <div className="w-full px-2 py-2">
      <div className="flex flex-wrap justify-center gap-1">
        {CHAIN_ALPHABET.map((letter) => {
          const outcome = outcomes[letter] ?? 'unseen'
          return (
            <div
              key={letter}
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all duration-300 ${CHIP[outcome]}`}
            >
              {letter}
            </div>
          )
        })}
      </div>
    </div>
  )
}
