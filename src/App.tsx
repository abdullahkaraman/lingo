import { useEffect, useRef, useState, useCallback } from 'react'
import { MultiplayerApp } from './components/multiplayer/MultiplayerApp'
import { LobbyPage } from './components/multiplayer/LobbyPage'
import { PassaparolaApp } from './components/passaparola/PassaparolaApp'
import { GameHeader } from './components/GameHeader'
import { GameBoard } from './components/GameBoard'
import { Keyboard } from './components/Keyboard'
import { ScoreBoard } from './components/ScoreBoard'
import { RoundResultModal } from './components/RoundResultModal'
import { WordLengthSetup } from './components/WordLengthSetup'
import { MobileActionBar } from './components/MobileActionBar'
import { useGame, MAX_ATTEMPTS } from './hooks/useGame'
import type { WordLength } from './types/game'

const VALID_LETTERS = new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split(''))

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('room')
  if (roomId) return <MultiplayerApp roomId={roomId} />
  if (params.has('lobby')) return <LobbyPage />
  if (params.has('passaparola')) return <PassaparolaApp />
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
  const [isListening, setIsListening] = useState(false)
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('lingo_player_name') ?? '',
  )
  const [nameInput, setNameInput] = useState(playerName)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ── Stamp build version into URL so local and phone can be compared ──────
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('v', __APP_VERSION__)
    history.replaceState(null, '', url.toString())
  }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, phase, currentGuessIndex])

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

  // ── Auto-focus hidden input on mobile when gameplay starts/resumes ────────
  useEffect(() => {
    if (view === 'game' && phase === 'playing') {
      const t = setTimeout(() => hiddenInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
    // Dismiss the native keyboard when the round ends
    if (phase === 'round_success' || phase === 'round_failed') {
      hiddenInputRef.current?.blur()
    }
  }, [view, phase])

  // ── Scroll active row into view after each guess ─────────────────────────
  useEffect(() => {
    if (view !== 'game' || phase !== 'playing') return
    // Delay matches the flip animation so the row is settled before scrolling
    const t = setTimeout(() => {
      document.querySelector<HTMLElement>('[data-active-row="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 350)
    return () => clearTimeout(t)
  }, [currentGuessIndex, view, phase])

  // ── Physical keyboard (desktop) ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // When the hidden input is focused it handles its own events via onInput
      if (e.target === hiddenInputRef.current) return
      if (view !== 'game' || phase !== 'playing' || isValidating) return
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Enter') { void submitGuess(); return }
      if (e.key === 'Backspace' || e.key === 'Delete') { deleteLast(); return }
      if (e.key.length === 1) {
        const upper = e.key.toLocaleUpperCase('tr-TR')
        if (VALID_LETTERS.has(upper)) typeChar(upper)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, phase, isValidating, typeChar, deleteLast, submitGuess])

  // ── Native keyboard input handler (mobile) ────────────────────────────────
  function handleNativeInput(e: React.FormEvent<HTMLInputElement>) {
    if (phase !== 'playing' || isValidating) return
    const ne = e.nativeEvent as InputEvent
    if (ne.inputType === 'deleteContentBackward') {
      deleteLast()
    } else if (ne.inputType === 'insertLineBreak') {
      // Android virtual keyboards fire this instead of a form submit event
      void submitGuess()
    } else if (ne.data) {
      const char = ne.data.toLocaleUpperCase('tr-TR')
      if (VALID_LETTERS.has(char)) typeChar(char)
    }
    // Keep a sentinel space so the next backspace press always has content to
    // delete and fires the input event (empty inputs swallow backspace silently).
    ;(e.target as HTMLInputElement).value = ' '
  }

  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (phase === 'playing' && !isValidating) void submitGuess()
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  function startVoiceInput() {
    console.group('[Voice Input] Mic clicked')
    console.log('speechSupported:', speechSupported)
    console.log('window.SpeechRecognition:', !!(window as any).SpeechRecognition)        // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log('window.webkitSpeechRecognition:', !!(window as any).webkitSpeechRecognition) // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log('isListening at click time:', isListening)
    console.groupEnd()

    if (!speechSupported) {
      console.warn('[Voice Input] Aborted — Speech API not supported in this browser')
      return
    }

    // Toggle off if already listening
    if (isListening) {
      console.log('[Voice Input] Already listening — stopping recognition')
      recognitionRef.current?.stop()
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR()
    recognition.lang = 'tr-TR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 5

    console.group('[Voice Input] Recognition configured')
    console.log('lang:', recognition.lang)
    console.log('continuous:', recognition.continuous)
    console.log('interimResults:', recognition.interimResults)
    console.log('maxAlternatives:', recognition.maxAlternatives)
    console.groupEnd()

    recognition.onstart = () => {
      console.log('[Voice Input] Recognition started — microphone is active')
      setIsListening(true)
    }

    recognition.onend = () => {
      console.log('[Voice Input] Recognition ended')
      setIsListening(false)
      // Restore focus so the player can keep typing / pressing Enter
      setTimeout(() => {
        hiddenInputRef.current?.focus()
        console.log('[Voice Input] Hidden input refocused')
      }, 80)
    }

    recognition.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.group('[Voice Input] Recognition error')
      console.error('error code:', e.error)
      console.error('error message:', e.message ?? '(no message)')
      console.error('full event:', e)
      console.groupEnd()
      setIsListening(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const store = useGame.getState()
      const { wordLength, currentInput } = store

      console.group('[Voice Input] Result received')
      console.log('wordLength expected:', wordLength)
      console.log('currentInput at result time:', currentInput)
      console.log('raw event.results:', event.results)
      console.log('result count:', event.results.length)
      console.log('alternatives in result[0]:', event.results[0].length)

      // Log every alternative before any filtering
      const alternatives: { transcript: string; confidence: number }[] = []
      for (let i = 0; i < event.results[0].length; i++) {
        alternatives.push({
          transcript: event.results[0][i].transcript,
          confidence: event.results[0][i].confidence,
        })
      }
      console.table(alternatives)

      // Try each alternative until we find one with the right length
      let matched: string | null = null
      for (let i = 0; i < event.results[0].length; i++) {
        const raw = event.results[0][i].transcript
        const firstWord = raw.trim().split(/\s+/)[0]
        const normalized = firstWord.toLocaleUpperCase('tr-TR')

        console.group(`[Voice Input] Evaluating alternative ${i}`)
        console.log('raw transcript:', raw)
        console.log('first word extracted:', firstWord)
        console.log('normalized (tr-TR uppercase):', normalized)
        console.log('char length:', [...normalized].length, '/ expected:', wordLength)

        if ([...normalized].length !== wordLength) {
          console.log('❌ Rejected — length mismatch:', [...normalized].length, '≠', wordLength)
          console.groupEnd()
          continue
        }

        const invalidChars = [...normalized].filter(c => !VALID_LETTERS.has(c))
        if (invalidChars.length > 0) {
          console.log('❌ Rejected — invalid characters:', invalidChars)
          console.groupEnd()
          continue
        }

        console.log('✅ Accepted:', normalized)
        console.groupEnd()
        matched = normalized
        break
      }

      if (!matched) {
        console.warn('[Voice Input] No valid match found across all alternatives — showing error')
        console.groupEnd()
        useGame.setState({ errorMessage: 'Kelime anlaşılamadı, tekrar dene!' })
        return
      }

      console.log('[Voice Input] Final accepted word:', matched)

      // Clear everything after the locked first letter, then type the rest
      const charsToDelete = currentInput.length - 1
      console.log('[Voice Input] Deleting', charsToDelete, 'chars before typing new word')
      for (let i = 0; i < charsToDelete; i++) useGame.getState().deleteLast()

      const charsToType = [...matched].slice(1)
      console.log('[Voice Input] Typing chars into row:', charsToType)
      for (let i = 1; i < [...matched].length; i++) useGame.getState().typeChar(matched[i])

      console.log('[Voice Input] Word written into row. currentInput is now:', useGame.getState().currentInput)
      console.groupEnd()
    }

    recognitionRef.current = recognition
    console.log('[Voice Input] Calling recognition.start()')
    recognition.start()
  }

  // ── Keyboard letter-status map ────────────────────────────────────────────
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
    <div
      className="fixed inset-0 overflow-hidden text-white flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #09090b 60%)' }}
    >
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
                onClick={() => { window.location.href = '?passaparola' }}
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
                    window.location.href = `?room=${id}`
                  }}
                  className="flex-1 px-5 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800
                    text-zinc-300 text-sm font-semibold hover:border-zinc-400 transition-colors
                    active:scale-95"
                >
                  Oda Oluştur
                </button>
                <button
                  onClick={() => { window.location.href = '?lobby' }}
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
              onMic={startVoiceInput}
              onSubmit={() => void submitGuess()}
              isListening={isListening}
              speechSupported={speechSupported}
              disabled={phase !== 'playing' || isValidating}
            />

            {/* On-screen keyboard — hidden on mobile, shown on desktop */}
            <div className="hidden md:flex flex-col w-full pb-4 mt-auto gap-3">
              {speechSupported && (
                <div className="flex justify-center">
                  <button
                    onClick={startVoiceInput}
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
                onEnter={() => void submitGuess()}
                letterStatuses={letterStatuses()}
                isValidating={isValidating}
              />
            </div>
          </div>
        )}
      </div>

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
