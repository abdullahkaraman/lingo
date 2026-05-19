import { useCallback, useEffect, useRef, useState } from 'react'
import { GameBoard } from '../GameBoard'
import { Keyboard } from '../Keyboard'
import type { PublicState, GuessRow, LetterStatus } from '../../game-engine/types'
import type { MultiplayerClient } from '../../multiplayer/client'
import type { GameError } from '../../hooks/useMultiplayerGame'

const VALID_LETTERS = new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split(''))

interface Props {
  state: PublicState
  myId: string
  error: GameError | null
  client: MultiplayerClient
}

// Merge the locally-typed input into the server's board rows for display.
function withLocalInput(
  rows: GuessRow[],
  rowIndex: number,
  input: string,
  wordLength: number,
): GuessRow[] {
  return rows.map((row, i) => {
    if (i !== rowIndex || row.submitted) return row
    return {
      ...row,
      letters: Array.from({ length: wordLength }, (_, j) => {
        const char = input[j] ?? ''
        return {
          char,
          status: (j === 0 ? 'correct' : char ? 'filled' : 'empty') as LetterStatus,
        }
      }),
    }
  })
}

function computeLetterStatuses(rows: GuessRow[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (!row.submitted) continue
    for (const l of row.letters) {
      if (!l.char) continue
      const cur = map[l.char]
      if (cur === 'correct') continue
      if (l.status === 'correct' || !cur) { map[l.char] = l.status; continue }
      if (l.status === 'present' && cur !== 'correct') map[l.char] = 'present'
    }
  }
  return map
}

export function MultiplayerGame({ state, myId, error, client }: Props) {
  const { isMyTurn, myBoard, wordLength, firstLetter, players } = state
  const canGuess = isMyTurn && myBoard.status === 'guessing'

  const [input, setInput] = useState(firstLetter)
  const [shaking, setShaking] = useState(false)
  const [displayError, setDisplayError] = useState<string | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Reset input when a new round starts or when it becomes our turn.
  useEffect(() => { setInput(firstLetter) }, [state.round, firstLetter])
  useEffect(() => { if (isMyTurn) setInput(firstLetter) }, [state.currentTurn, isMyTurn, firstLetter])

  // Reset input when a guess is accepted (row index advances).
  const prevRowIndex = useRef(myBoard.currentRowIndex)
  useEffect(() => {
    if (myBoard.currentRowIndex !== prevRowIndex.current) {
      prevRowIndex.current = myBoard.currentRowIndex
      setInput(firstLetter)
    }
  }, [myBoard.currentRowIndex, firstLetter])

  // Show error, shake the board, then auto-clear after 2.5 s.
  // Watching error.key ensures the same message re-triggers on repeated invalid guesses.
  useEffect(() => {
    if (!error) return
    setDisplayError(error.message)
    setShaking(true)
    const shakeTimer = setTimeout(() => setShaking(false), 600)
    const clearTimer = setTimeout(() => setDisplayError(null), 2500)
    return () => { clearTimeout(shakeTimer); clearTimeout(clearTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.key])

  // Auto-focus hidden input when it's our turn.
  useEffect(() => {
    if (canGuess) setTimeout(() => hiddenInputRef.current?.focus(), 80)
    else hiddenInputRef.current?.blur()
  }, [canGuess])

  // Physical keyboard.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target === hiddenInputRef.current) return
      if (!canGuess) return
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Enter') { handleSubmit(); return }
      if (e.key === 'Backspace' || e.key === 'Delete') { handleDelete(); return }
      if (e.key.length === 1) {
        const upper = e.key.toLocaleUpperCase('tr-TR')
        if (VALID_LETTERS.has(upper)) handleTypeChar(upper)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleTypeChar = useCallback((char: string) => {
    if (!canGuess) return
    setInput((prev) => [...prev].length < wordLength ? prev + char : prev)
  }, [canGuess, wordLength])

  const handleDelete = useCallback(() => {
    if (!canGuess) return
    setInput((prev) => [...prev].length <= 1 ? firstLetter : [...prev].slice(0, -1).join(''))
  }, [canGuess, firstLetter])

  const handleSubmit = useCallback(() => {
    if (!canGuess || [...input].length < wordLength) return
    client.send({ type: 'guess', word: input })
  }, [canGuess, input, wordLength, client])

  function handleNativeInput(e: React.FormEvent<HTMLInputElement>) {
    if (!canGuess) return
    const ne = e.nativeEvent as InputEvent
    if (ne.inputType === 'deleteContentBackward') handleDelete()
    else if (ne.inputType === 'insertLineBreak') handleSubmit()
    else if (ne.data) {
      const char = ne.data.toLocaleUpperCase('tr-TR')
      if (VALID_LETTERS.has(char)) handleTypeChar(char)
    }
    ;(e.target as HTMLInputElement).value = ' '
  }

  const displayRows = withLocalInput(myBoard.rows, myBoard.currentRowIndex, input, wordLength)
  const letterStatuses = computeLetterStatuses(myBoard.rows)
  const opponentEntries = Object.entries(state.opponents)

  const myName = players[myId]?.name ?? 'Sen'
  const myScore = players[myId]?.score ?? 0

  return (
    <div className="w-full flex flex-col items-center flex-1 min-h-0 px-3">
      {/* Score bar */}
      <div className="w-full max-w-lg flex items-center justify-between py-3 text-sm">
        <div className="text-center">
          <div className="text-zinc-400 text-xs">{myName}</div>
          <div className="text-white font-bold text-lg">{myScore}</div>
        </div>
        <div className="text-center text-zinc-500 text-xs">
          <div>Tur</div>
          <div className="text-white font-bold">{state.round}/{state.maxRounds}</div>
        </div>
        {opponentEntries.map(([id]) => (
          <div key={id} className="text-center">
            <div className="text-zinc-400 text-xs">{players[id]?.name ?? 'Rakip'}</div>
            <div className="text-white font-bold text-lg">{players[id]?.score ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Turn banner */}
      <div className={`w-full max-w-lg mb-2 py-2 px-4 rounded-xl text-center text-sm font-semibold transition-colors ${
        myBoard.status !== 'guessing'
          ? 'bg-zinc-800 text-zinc-400'
          : isMyTurn
          ? 'bg-green-900/60 border border-green-700/50 text-green-300'
          : 'bg-zinc-800/60 text-zinc-400'
      }`}>
        {myBoard.status === 'won'
          ? '🎉 Kazandın! Rakibi bekliyorsun…'
          : myBoard.status === 'lost'
          ? 'Bitti — rakibi bekliyorsun…'
          : isMyTurn
          ? 'Senin sıran!'
          : 'Rakibin düşünüyor…'}
      </div>

      {/* Opponent progress dots */}
      {opponentEntries.map(([id, board]) => (
        <div key={id} className="w-full max-w-lg mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
          <div className={`w-2 h-2 rounded-full shrink-0 ${players[id]?.connected ? 'bg-green-400' : 'bg-zinc-600'}`} />
          <span className="text-zinc-300 text-sm font-semibold flex-1">{players[id]?.name ?? 'Rakip'}</span>
          <div className="flex gap-1 items-center">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border ${
                  i < board.submittedCount
                    ? 'bg-zinc-400 border-zinc-400'
                    : 'border-zinc-600'
                }`}
              />
            ))}
            {board.status === 'won' && <span className="ml-1 text-green-400 text-xs font-bold">✓</span>}
            {board.status === 'lost' && <span className="ml-1 text-red-400 text-xs font-bold">✗</span>}
          </div>
        </div>
      ))}

      {/* Error message */}
      <div className="h-7 flex items-center justify-center mb-1 w-full max-w-lg">
        {displayError && (
          <div className="px-4 py-1 bg-red-900/80 border border-red-600/50 rounded-full text-red-300 text-sm font-semibold animate-fadeIn">
            {displayError}
          </div>
        )}
      </div>

      {/* Board */}
      <div
        className="w-full flex-1 flex items-start justify-center mb-3 relative min-h-0"
        style={{ maxWidth: `${wordLength * 70}px` }}
        onClick={() => { if (canGuess) hiddenInputRef.current?.focus() }}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <input
            ref={hiddenInputRef}
            onInput={handleNativeInput}
            defaultValue=" "
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
            style={{
              position: 'fixed', top: '50%', left: '-9999px',
              width: '1px', height: '1px', opacity: 0, fontSize: '16px',
            }}
          />
        </form>
        <GameBoard
          guesses={displayRows}
          currentGuessIndex={myBoard.currentRowIndex}
          wordLength={wordLength}
          shaking={shaking}
          isFlashingRed={false}
        />
      </div>

      {/* On-screen keyboard — hidden on mobile, shown on desktop */}
      <div className="hidden md:block w-full pb-4 mt-auto">
        <Keyboard
          onKey={handleTypeChar}
          onDelete={handleDelete}
          onEnter={handleSubmit}
          letterStatuses={letterStatuses}
          isValidating={!canGuess}
        />
      </div>
    </div>
  )
}
