import { useEffect, useState } from 'react'
import { REVEAL_STAGGER_MS } from '../game/constants'
import type { LetterStatus } from '../game/types'

interface LetterCellProps {
  char: string
  status: LetterStatus
  submitted: boolean
  index: number
  isCurrentRow: boolean
  isFlashing: boolean
}

const STATUS_CLASSES: Record<LetterStatus, string> = {
  correct: 'bg-green-600 border-green-500 text-white shadow-green-500/40',
  present: 'bg-yellow-500 border-yellow-400 text-white shadow-yellow-400/40',
  absent: 'bg-zinc-700 border-zinc-600 text-zinc-300',
  filled: 'bg-zinc-800 border-yellow-400 text-white',
  empty: 'bg-zinc-900 border-zinc-600 text-white',
}

export function LetterCell({ char, status, submitted, index, isCurrentRow, isFlashing }: LetterCellProps) {
  const [revealed, setRevealed] = useState(false)
  const [mid, setMid] = useState(false) // true during the 90-degree hidden phase

  useEffect(() => {
    if (submitted && !revealed) {
      const delay = index * REVEAL_STAGGER_MS
      // Phase 1: rotate to 90deg (hide current face)
      const t1 = setTimeout(() => setMid(true), delay)
      // Phase 2: swap color, rotate back to 0deg (show result)
      const t2 = setTimeout(() => {
        setMid(false)
        setRevealed(true)
      }, delay + 250)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    if (!submitted) {
      setRevealed(false)
      setMid(false)
    }
  }, [submitted, index, revealed])

  const displayStatus: LetterStatus =
    submitted && revealed ? status : submitted && !mid ? 'filled' : status

  const transform = mid
    ? 'rotateX(90deg)'
    : revealed && submitted
    ? 'rotateX(0deg)'
    : 'rotateX(0deg)'

  const transition = mid
    ? 'transform 0.25s ease-in'
    : revealed && submitted
    ? 'transform 0.25s ease-out'
    : ''

  return (
    <div
      className={[
        'flex items-center justify-center',
        'font-black tracking-wider select-none',
        'border-2 rounded-lg shadow-lg',
        isFlashing ? 'animate-flashRed' : STATUS_CLASSES[displayStatus],
        isCurrentRow && !submitted && char ? 'animate-pop' : '',
      ].join(' ')}
      style={{
        transform,
        transition,
        width: '100%',
        aspectRatio: '1',
        fontSize: 'clamp(0.9rem, 3.5vw, 1.6rem)',
      }}
    >
      {char}
    </div>
  )
}
