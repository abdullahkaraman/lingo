import { useRef, useState } from 'react'
import { VALID_LETTERS } from '../game/constants'

interface UseVoiceInputOptions {
  /** Expected word length — used to filter speech alternatives. */
  wordLength: number
  /** Called when a valid word matching the expected length is recognized. */
  onWord: (word: string) => void
  /** Called when no valid alternative is found. */
  onError?: (message: string) => void
}

export function useVoiceInput({ wordLength, onWord, onError }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function startVoiceInput(hiddenInputRef?: React.RefObject<HTMLInputElement | null>) {
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
      if (hiddenInputRef) {
        setTimeout(() => {
          hiddenInputRef.current?.focus()
          console.log('[Voice Input] Hidden input refocused')
        }, 80)
      }
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
      console.group('[Voice Input] Result received')
      console.log('wordLength expected:', wordLength)
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
        onError?.('Kelime anlaşılamadı, tekrar dene!')
        return
      }

      console.log('[Voice Input] Final accepted word:', matched)
      console.log('[Voice Input] Calling onWord callback:', matched)
      onWord(matched)
      console.groupEnd()
    }

    recognitionRef.current = recognition
    console.log('[Voice Input] Calling recognition.start()')
    recognition.start()
  }

  return { isListening, speechSupported, startVoiceInput }
}
