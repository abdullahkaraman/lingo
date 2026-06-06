import { useEffect, useRef, useState, useCallback } from 'react'
import { GameHeader } from '../GameHeader'
import { GameBoard } from '../GameBoard'
import { Keyboard } from '../Keyboard'
import { AlphabetStrip } from './AlphabetStrip'
import { usePassaparola, PASSAPAROLA_ALPHABET } from '../../hooks/usePassaparola'
import { useTurkishKeyboardInput } from '../../hooks/useTurkishKeyboardInput'



export function PassaparolaApp() {
  const {
    phase, wordLength, queue, skipped, outcomes,
    targetWord, guesses, currentGuessIndex,
    score, roundScore, skipReason, errorMessage, isFlashingRed, results,
    startGame, typeChar, deleteLast, clearInput, submitGuess,
    passLetter, advance, clearError, resetGame,
  } = usePassaparola()

  const [shaking, setShaking] = useState(false)
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLetter = queue[0] ?? ''

  // ── Start on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'idle') startGame()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { hiddenInputRef, handleNativeInput } = useTurkishKeyboardInput({
    onChar: typeChar,
    onDelete: deleteLast,
    onEnter: () => { void submitGuess() },
    onTab: passLetter,
    onInvalidKey: () => {
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    },
    isActive: phase === 'playing',
  })

  // ── Shake on error ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!errorMessage) return
    setShaking(true)
    if (errorTimeout.current) clearTimeout(errorTimeout.current)
    errorTimeout.current = setTimeout(() => {
      setShaking(false)
      clearError()
    }, 600)
  }, [errorMessage, clearError])

  // ── Letter status map for keyboard colours ───────────────────────────────────
  const letterStatuses = useCallback((): Record<string, string> => {
    const map: Record<string, string> = {}
    for (const row of guesses) {
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
  }, [guesses])

  // ── Game over screen ─────────────────────────────────────────────────────────
  if (phase === 'game_over') {
    const solvedCount = results.filter((r) => r.solved).length
    return (
      <div
        className="fixed inset-0 overflow-y-auto text-white flex flex-col items-center"
        style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
      >
        <div className="w-full max-w-lg flex flex-col pb-10">
          <GameHeader onRestart={null} />

          <div className="text-center px-6 pt-4 pb-6">
            <div className="text-4xl mb-1">🏆</div>
            <div className="text-2xl font-bold mb-1">Tebrikler!</div>
            <div className="text-zinc-400 text-sm mb-4">
              {solvedCount} / {PASSAPAROLA_ALPHABET.length} harf çözüldü
            </div>
            <div className="text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">puan</div>
          </div>

          {/* Results table */}
          <div className="px-4 flex flex-col gap-1.5">
            {[...PASSAPAROLA_ALPHABET].map((letter) => {
              const r = results.find((x) => x.letter === letter)
              if (!r) return null
              return (
                <div
                  key={letter}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                    r.solved
                      ? 'bg-green-900/30 border-green-700/50'
                      : 'bg-zinc-800/60 border-zinc-700'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    r.solved ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}>{letter}</span>
                  <span className="font-mono font-bold text-white tracking-widest flex-1">
                    {r.targetWord}
                  </span>
                  {r.solved ? (
                    <span className="text-green-400 text-xs font-semibold">+{r.score}</span>
                  ) : (
                    <span className="text-zinc-600 text-xs">Pas</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-4 mt-6">
            <button
              onClick={() => { resetGame(); startGame() }}
              className="w-full py-3.5 rounded-xl bg-yellow-500 text-black font-bold text-lg
                active:scale-95 transition-all"
            >
              Yeniden Oyna
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="w-full mt-2 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700
                text-zinc-400 font-semibold text-sm active:scale-95 transition-all"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Round result overlay (won / skipped) ─────────────────────────────────────
  const showResult = phase === 'round_won' || phase === 'round_skipped'

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
      <div
        className="w-full max-w-lg h-full flex flex-col px-3"
        onClick={() => { if (phase === 'playing') hiddenInputRef.current?.focus() }}
      >
        <GameHeader onRestart={() => { window.location.href = '/' }} />
        {/* Hidden input moved to bottom, but we still need currentLetter here */}

        {/* Alphabet strip */}
        <AlphabetStrip outcomes={outcomes} />

        {/* Status bar: letter + cycle + score */}
        <div className="flex items-center justify-between px-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-widest">Harf</span>
            <span className="text-xl font-bold text-yellow-400">{currentLetter}</span>
            {skipped.length > 0 && (
              <span className="text-xs text-orange-400 bg-orange-900/30 border border-orange-700/50
                px-2 py-0.5 rounded-full">
                {skipped.length} bekliyor
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{score.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">puan</div>
          </div>
        </div>

        {/* Progress: X/29 */}
        <div className="px-2 mb-2">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: `${(Object.values(outcomes).filter((o) => o === 'solved').length / PASSAPAROLA_ALPHABET.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Error message */}
        <div className="h-6 flex items-center justify-center mb-1">
          {errorMessage && (
            <div className="px-4 py-1 bg-red-900/80 border border-red-600/50 rounded-full
              text-red-300 text-xs font-semibold animate-fadeIn">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Board area */}
        <div className="flex-1 min-h-0 flex items-start justify-center relative">
          <div style={{ width: '100%', maxWidth: `${wordLength * 64}px` }}>
            <GameBoard
              guesses={guesses}
              currentGuessIndex={currentGuessIndex}
              wordLength={wordLength}
              shaking={shaking}
              isFlashingRed={isFlashingRed}
            />
          </div>

          {/* Round result overlay */}
          {showResult && (
            <div className="absolute inset-0 flex flex-col items-center justify-center
              bg-black/70 backdrop-blur-sm rounded-2xl">
              {phase === 'round_won' ? (
                <>
                  <div className="text-5xl mb-2">✓</div>
                  <div className="text-green-400 text-lg font-bold mb-1">Doğru!</div>
                  <div className="text-white font-mono text-2xl font-bold tracking-widest mb-1">
                    {targetWord}
                  </div>
                  <div className="text-yellow-400 text-sm font-semibold mb-6">+{roundScore} puan</div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">{skipReason === 'passed' ? '→' : '✗'}</div>
                  <div className="text-orange-400 text-lg font-bold mb-1">
                    {skipReason === 'passed' ? 'Pas Geçildi' : 'Bilemedin'}
                  </div>
                  <div className="text-zinc-400 text-xs mb-1">Doğru kelime</div>
                  <div className="text-white font-mono text-2xl font-bold tracking-widest mb-6">
                    {targetWord}
                  </div>
                </>
              )}
              <button
                onClick={advance}
                autoFocus
                className="px-8 py-3 rounded-xl bg-yellow-500 text-black font-bold text-base
                  active:scale-95 transition-all"
              >
                Devam →
              </button>
            </div>
          )}
        </div>

        {/* Mobile action row: Pass | Delete | Submit */}
        <div className="md:hidden flex gap-2 mt-2 pb-5">
          <button
            onPointerDown={(e) => { e.preventDefault(); passLetter() }}
            disabled={phase !== 'playing'}
            className="flex-1 py-4 rounded-2xl bg-zinc-800 border border-zinc-700
              text-zinc-300 font-bold text-sm active:scale-95 transition-all select-none
              disabled:opacity-30"
          >
            Pas →
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); clearInput() }}
            disabled={phase !== 'playing'}
            className="flex-1 py-4 rounded-2xl bg-zinc-800 border border-zinc-700
              text-white text-2xl active:scale-95 transition-all select-none
              disabled:opacity-40"
          >
            ⌫
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); void submitGuess() }}
            disabled={phase !== 'playing'}
            className="flex-1 py-4 rounded-2xl bg-yellow-500 border border-yellow-400
              text-zinc-900 text-2xl font-black active:scale-95 transition-all select-none
              disabled:opacity-40"
          >
            →
          </button>
        </div>

        {/* Desktop: Pass button + keyboard */}
        <div className="hidden md:flex flex-col w-full pb-3 gap-2 mt-auto">
          <button
            onClick={passLetter}
            disabled={phase !== 'playing'}
            className="w-full py-2 rounded-xl bg-zinc-800 border border-zinc-700
              text-zinc-400 font-bold text-sm active:scale-95 transition-all
              disabled:opacity-30"
          >
            Pas geç → <span className="text-zinc-600 text-xs">(Tab)</span>
          </button>
          <Keyboard
            onKey={typeChar}
            onDelete={clearInput}
            onEnter={() => void submitGuess()}
            letterStatuses={letterStatuses()}
            isValidating={false}
          />
        </div>
      </div>

      {/* Hidden native keyboard input handled by hook */}
      <form onSubmit={(e) => { e.preventDefault(); void submitGuess() }}>
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
    </div>
  )
}
