import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameHeader } from './GameHeader'
import { GameBoard } from './GameBoard'
import { Keyboard } from './Keyboard'
import { ScoreBoard } from './ScoreBoard'
import { RoundResultModal } from './RoundResultModal'
import { WordLengthSetup } from './WordLengthSetup'
import { MobileActionBar } from './MobileActionBar'
import { MAX_ATTEMPTS } from '../game/constants'
import { useGame } from '../hooks/useGame'
import { useTurkishKeyboardInput } from '../hooks/useTurkishKeyboardInput'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { computeLetterStatuses } from '../game/keyboard'
import type { WordLength } from '../game/types'

export function SoloGame() {
  const navigate = useNavigate()
  const {
    guesses, currentGuessIndex, wordLength, targetWord,
    phase, failReason, score, roundScore, errorMessage,
    timerMax, timeLeft, isFlashingRed, wordsPlayed, wordsGuessed,
    isValidating,
    typeChar, deleteLast, clearInput, submitGuess, clearError,
    tickTimer, startNewWord, setWordLength, resetGame,
  } = useGame()

  const [view, setView] = useState<'setup' | 'game'>('setup')
  const [shaking, setShaking] = useState(false)
  
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('lingo_player_name') ?? '',
  )
  const [nameInput, setNameInput] = useState(playerName)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { isListening, speechSupported, startVoiceInput } = useVoiceInput()

  // ── Word length selection ─────────────────────────────────────────────────
  function handleSelectLength(len: WordLength, timerSeconds: number) {
    setWordLength(len, timerSeconds)
    setView('game')
  }

  // ── Restart → back to setup ───────────────────────────────────────────────
  function handleRestart() {
    resetGame()
    setView('setup')
  }

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'game' || phase !== 'playing') return
    const interval = setInterval(tickTimer, 1000)
    return () => clearInterval(interval)
  }, [view, phase, currentGuessIndex, tickTimer])

  // ── Input Handling ────────────────────────────────────────────────────────
  const { hiddenInputRef, handleNativeInput } = useTurkishKeyboardInput({
    onChar: typeChar,
    onDelete: deleteLast,
    onEnter: () => { submitGuess() },
    onInvalidKey: () => {
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    },
    isActive: view === 'game' && phase === 'playing',
    disabled: isValidating,
  })

  // ── Shake on error ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!errorMessage) return
    setShaking(true)
    if (errorTimeout.current) clearTimeout(errorTimeout.current)
    errorTimeout.current = setTimeout(() => {
      setShaking(false)
      clearError()
    }, 600)
  }, [errorMessage, clearError])

  // ── Scroll active row into view after each guess ─────────────────────────
  useEffect(() => {
    if (view !== 'game' || phase !== 'playing') return
    const t = setTimeout(() => {
      document.querySelector<HTMLElement>('[data-active-row="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 350)
    return () => clearTimeout(t)
  }, [currentGuessIndex, view, phase])

  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (phase === 'playing' && !isValidating) submitGuess()
  }

  function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed) {
      localStorage.setItem('lingo_player_name', trimmed)
      setPlayerName(trimmed)
      setNameInput(trimmed)
    } else {
      setNameInput(playerName)
    }
    setEditingName(false)
  }

  const remainingAttempts = Math.max(
    0,
    MAX_ATTEMPTS - currentGuessIndex - (phase !== 'playing' ? 1 : 0),
  )

  return (
    <div className="w-full max-w-lg h-full flex flex-col items-center px-3">
      <GameHeader onRestart={view === 'game' ? handleRestart : null} />

      {view === 'setup' ? (
        <>
          <WordLengthSetup onSelect={handleSelectLength} />

          {/* Username section */}
          <div className="w-full max-w-xs mx-auto mt-5 mb-1">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 text-center">
              Kullanıcı Adı
            </div>
            {editingName ? (
              <form
                onSubmit={(e) => { e.preventDefault(); saveName() }}
                className="flex gap-2"
              >
                <input
                  ref={nameInputRef}
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveName}
                  maxLength={20}
                  placeholder="Adınız"
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-800 border border-yellow-500
                    text-white placeholder:text-zinc-500 text-sm font-semibold text-center
                    focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm
                    active:scale-95 transition-all"
                >
                  Kaydet
                </button>
              </form>
            ) : (
              <button
                onClick={() => { setEditingName(true); setNameInput(playerName) }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors
                  active:scale-95 group"
              >
                <span className="text-white font-semibold text-sm">
                  {playerName || <span className="text-zinc-500">Ad girilmedi</span>}
                </span>
                <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors text-xs">✎</span>
              </button>
            )}
          </div>

          <div className="mt-4 mb-6 flex flex-col gap-2 w-full max-w-xs mx-auto">
            <button
              onClick={() => navigate('/passaparola')}
              className="w-full px-5 py-3 rounded-xl border border-yellow-600/50 bg-yellow-900/20
                text-yellow-300 text-sm font-bold hover:border-yellow-500 transition-colors
                active:scale-95"
            >
              🎯 Passaparola Modu
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
                  navigate(`/room/${id}`)
                }}
                className="flex-1 px-5 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800
                  text-zinc-300 text-sm font-semibold hover:border-zinc-400 transition-colors
                  active:scale-95"
              >
                Oda Oluştur
              </button>
              <button
                onClick={() => navigate('/lobby')}
                className="flex-1 px-5 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800
                  text-zinc-300 text-sm font-semibold hover:border-zinc-400 transition-colors
                  active:scale-95"
              >
                Aktif Odalar
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Tapping anywhere on the game area re-focuses the hidden input */
        <div
          className="w-full flex flex-col items-center flex-1 min-h-0"
          onClick={() => { if (phase === 'playing') hiddenInputRef.current?.focus() }}
        >
          {/* Hidden input for native mobile keyboard */}
          <form onSubmit={handleNativeSubmit}>
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
              // font-size ≥ 16px prevents iOS from zooming on focus
              style={{
                position: 'fixed', top: '50%', left: '-9999px',
                width: '1px', height: '1px', opacity: 0,
                fontSize: '16px',
              }}
            />
          </form>

          <div className="w-full mt-1 mb-3">
            <ScoreBoard
              score={score}
              remainingAttempts={remainingAttempts}
              totalAttempts={MAX_ATTEMPTS}
              timerMax={timerMax}
              timeLeft={timeLeft}
              wordsPlayed={wordsPlayed}
              wordsGuessed={wordsGuessed}
              isPlaying={phase === 'playing'}
            />
          </div>

          {/* Error / status message */}
          <div className="h-7 flex items-center justify-center mb-1">
            {errorMessage && (
              <div className="px-4 py-1 bg-red-900/80 border border-red-600/50 rounded-full
                text-red-300 text-sm font-semibold animate-fadeIn">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Game board */}
          <div
            className="w-full flex-1 flex items-start justify-center mb-3 relative min-h-0"
            style={{ maxWidth: `${wordLength * 70}px` }}
          >
            <GameBoard
              guesses={guesses}
              currentGuessIndex={currentGuessIndex}
              wordLength={wordLength}
              shaking={shaking}
              isFlashingRed={isFlashingRed}
            />
          </div>

          {/* Mobile action bar — delete / mic / submit */}
          <MobileActionBar
            onDelete={clearInput}
            onMic={() => startVoiceInput(hiddenInputRef)}
            onSubmit={() => submitGuess()}
            isListening={isListening}
            speechSupported={speechSupported}
            disabled={phase !== 'playing' || isValidating}
          />

          {/* On-screen keyboard — hidden on mobile, shown on desktop */}
          <div className="hidden md:flex flex-col w-full pb-4 mt-auto gap-3">
            {speechSupported && (
              <div className="flex justify-center">
                <button
                  onClick={() => startVoiceInput(hiddenInputRef)}
                  disabled={phase !== 'playing' || isValidating}
                  className={[
                    'flex items-center gap-2 px-5 py-2 rounded-xl border text-sm font-semibold',
                    'transition-all duration-150 active:scale-95 disabled:opacity-40',
                    isListening
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500',
                  ].join(' ')}
                >
                  <span className="text-base">🎤</span>
                  <span>{isListening ? 'Dinleniyor…' : 'Ses Girişi'}</span>
                </button>
              </div>
            )}
            <Keyboard
              onKey={typeChar}
              onDelete={clearInput}
              onEnter={() => submitGuess()}
              letterStatuses={computeLetterStatuses(guesses)}
              isValidating={isValidating}
            />
          </div>
        </div>
      )}

      {view === 'game' && (
        <RoundResultModal
          phase={phase}
          failReason={failReason}
          targetWord={targetWord}
          roundScore={roundScore}
          totalScore={score}
          wordLength={wordLength}
          wordsPlayed={wordsPlayed}
          wordsGuessed={wordsGuessed}
          guesses={guesses}
          onNewWord={() => void startNewWord()}
        />
      )}
    </div>
  )
}
