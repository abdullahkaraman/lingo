import { useEffect, useRef } from 'react'
import { LetterCell } from './LetterCell'
import type { GuessRow } from '../types/game'

interface GameBoardProps {
  guesses: GuessRow[]
  currentGuessIndex: number
  wordLength: number
  shaking: boolean
  isFlashingRed: boolean
}

export function GameBoard({ guesses, currentGuessIndex, wordLength, shaking, isFlashingRed }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shaking || !boardRef.current) return
    const el = boardRef.current
    el.classList.add('animate-shake')
    const t = setTimeout(() => el.classList.remove('animate-shake'), 500)
    return () => clearTimeout(t)
  }, [shaking])

  const maxCellPx = wordLength === 4 ? 72 : wordLength === 5 ? 64 : wordLength === 6 ? 58 : 52

  return (
    <div ref={boardRef} className="flex flex-col gap-2 w-full items-center">
      {guesses.map((row, rowIdx) => {
        const isActiveRow = rowIdx === currentGuessIndex
        const isFuture = rowIdx > currentGuessIndex && !row.submitted
        const rowFlash = isFlashingRed && isActiveRow

        return (
          <div
            key={rowIdx}
            data-active-row={isActiveRow ? 'true' : undefined}
            className="flex gap-2 w-full justify-center"
            style={{ opacity: isFuture ? 0.35 : 1 }}
          >
            {row.letters.map((letter, colIdx) => (
              <div key={colIdx} style={{ flex: 1, maxWidth: maxCellPx }}>
                <LetterCell
                  char={letter.char}
                  status={letter.status}
                  submitted={row.submitted}
                  index={colIdx}
                  isCurrentRow={isActiveRow}
                  isFlashing={rowFlash}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
