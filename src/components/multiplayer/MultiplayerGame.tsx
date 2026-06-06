import { useCallback, useEffect, useRef, useState } from 'react'
import { GameBoard } from '../GameBoard'
import { Keyboard } from '../Keyboard'
import type { PublicState } from '../../game-engine/types'
import type { MultiplayerClient } from '../../multiplayer/client'
import type { GameError } from '../../hooks/useMultiplayerGame'

import { getConfirmedLetters, buildInputArray, withLocalInput } from '../../game/board'
import { computeLetterStatuses } from '../../game/keyboard'
import { getRevealDuration } from '../../game/revealAnimation'
import { useTurkishKeyboardInput } from '../../hooks/useTurkishKeyboardInput'


interface Props {
  state: PublicState
  myId: string
  error: GameError | null
  client: MultiplayerClient
}



export function MultiplayerGame({ state, myId, error, client }: Props) {
  const { isMyTurn, myBoard, wordLength, players, timerSeconds } = state
  const canGuess = isMyTurn && myBoard.status === 'guessing'
  const timerActive = timerSeconds > 0

  const [input, setInput] = useState<string[]>(() =>
    buildInputArray(wordLength, getConfirmedLetters(myBoard.rows))
  )
  const [shaking, setShaking] = useState(false)
  const [displayError, setDisplayError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(timerSeconds)
  const [passVisible, setPassVisible] = useState(false)
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  function cancelReveal() {
    revealTimers.current.forEach(clearTimeout)
    revealTimers.current = []
  }

  // New round: clear everything immediately (no animation needed between rounds).
  useEffect(() => {
    cancelReveal()
    setInput(buildInputArray(wordLength, getConfirmedLetters(myBoard.rows)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.round])

  // Turn change: if it just became our turn, show confirmed letters immediately.
  useEffect(() => {
    if (!isMyTurn) return
    cancelReveal()
    setInput(buildInputArray(wordLength, getConfirmedLetters(myBoard.rows)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurn, isMyTurn])

  // Guess accepted (row index advances): wait for the flip, then animate confirmed letters in.
  const prevRowIndex = useRef(myBoard.currentRowIndex)
  useEffect(() => {
    if (myBoard.currentRowIndex === prevRowIndex.current) return
    prevRowIndex.current = myBoard.currentRowIndex

    cancelReveal()
    setInput(Array(wordLength).fill(''))

    const confirmed = getConfirmedLetters(myBoard.rows)
    const entries = Object.entries(confirmed)
      .map(([k, v]) => [Number(k), v] as [number, string])
      .sort((a, b) => a[0] - b[0])

    const flipDone = getRevealDuration(wordLength)
    const stagger = 200

    entries.forEach(([pos, char], idx) => {
      const t = setTimeout(() => {
        setInput((prev) => {
          const next = [...prev]
          next[pos] = char
          return next
        })
      }, flipDone + idx * stagger)
      revealTimers.current.push(t)
    })

    return cancelReveal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBoard.currentRowIndex])

  // Reset and run countdown timer when it's our turn.
  useEffect(() => {
    if (!timerActive) return
    setTimeLeft(timerSeconds)
  }, [state.currentTurn, timerSeconds, timerActive])

  useEffect(() => {
    if (!timerActive || !canGuess) return
    if (timeLeft <= 0) {
      client.send({ type: 'skip_turn' })
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, timerActive, canGuess, client])

  // When there's no timer: reveal the Pass button after 30 s on the player's turn.
  useEffect(() => {
    setPassVisible(false)
    if (timerActive || !canGuess) return
    const id = setTimeout(() => setPassVisible(true), 30_000)
    return () => clearTimeout(id)
  }, [state.currentTurn, timerActive, canGuess])

  // Show error, shake the board, then auto-clear after 2.5 s.
  // Watching error.key ensures the same message re-triggers on repeated invalid guesses.
  // When error becomes null (state update / new round), clear immediately so old toasts
  // don't linger after the cleanup function cancels the auto-clear timer.
  useEffect(() => {
    if (!error) {
      setDisplayError(null)
      setShaking(false)
      return
    }
    setDisplayError(error.message)
    setShaking(true)
    const shakeTimer = setTimeout(() => setShaking(false), 600)
    const clearTimer = setTimeout(() => setDisplayError(null), 2500)
    return () => { clearTimeout(shakeTimer); clearTimeout(clearTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.key])



  const handleTypeChar = useCallback((char: string) => {
    if (!canGuess) return
    setInput((prev) => {
      const nextPos = prev.findIndex((c, i) => c === '' && i !== 0)
      if (nextPos === -1) return prev
      const next = [...prev]
      next[nextPos] = char
      return next
    })
  }, [canGuess, myBoard.rows])

  const handleDelete = useCallback(() => {
    if (!canGuess) return
    setInput((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i] !== '' && i !== 0) {
          const next = [...prev]
          next[i] = ''
          return next
        }
      }
      return prev
    })
  }, [canGuess, myBoard.rows])

  const handleSubmit = useCallback(() => {
    if (!canGuess || input.includes('')) return
    client.send({ type: 'guess', word: input.join('') })
  }, [canGuess, input, client])

  const { hiddenInputRef, handleNativeInput } = useTurkishKeyboardInput({
    onChar: handleTypeChar,
    onDelete: handleDelete,
    onEnter: handleSubmit,
    onInvalidKey: () => {
      setShaking(true)
      setTimeout(() => setShaking(false), 600)
    },
    isActive: canGuess,
  })



  const displayRows = withLocalInput(myBoard.rows, myBoard.currentRowIndex, input)
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

      {/* Pass button — no-timer mode only, appears after 30 s */}
      {passVisible && (
        <button
          onClick={() => client.send({ type: 'skip_turn' })}
          className="w-full max-w-lg mb-2 py-2 px-4 rounded-xl text-sm font-semibold bg-zinc-700/70 border border-zinc-600/50 text-zinc-300 hover:bg-zinc-600/70 hover:text-white transition-colors"
        >
          Pas Geç
        </button>
      )}

      {/* Turn timer */}
      {timerActive && canGuess && (
        <div className="w-full max-w-lg mb-2 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Süre</span>
            <span className={`text-xs font-bold tabular-nums ${
              timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
            }`}>{timeLeft}s</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-400' : 'bg-green-500'
              }`}
              style={{ width: `${(timeLeft / timerSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

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
