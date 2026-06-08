import { useEffect, useRef, useCallback } from 'react'
import { VALID_LETTERS } from '../game/constants'

interface TurkishKeyboardOptions {
  onChar: (char: string) => void
  onDelete: () => void
  onEnter: () => void
  onTab?: () => void
  onInvalidKey?: () => void
  /**
   * If true, the hook will attempt to keep the hidden input focused for mobile keyboards.
   */
  isActive?: boolean
  /**
   * If true, input processing is suspended.
   */
  disabled?: boolean
}

/** Returns true if the element is a user-editable field that should own its own keystrokes. */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

/**
 * Shared hook for handling Turkish game input across both desktop and mobile.
 * Manages a hidden input field to trigger the native mobile keyboard and
 * provides a physical keyboard listener for desktop.
 */
export function useTurkishKeyboardInput({
  onChar,
  onDelete,
  onEnter,
  onTab,
  onInvalidKey,
  isActive = false,
  disabled = false,
}: TurkishKeyboardOptions) {
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // ── Physical Keyboard (Desktop) ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled || !isActive) return

      // Let real editable fields own their keystrokes (but NOT our hidden game input).
      if (e.target !== hiddenInputRef.current && isEditableTarget(e.target)) return

      // Block browser/OS shortcuts entirely — never intercept these.
      if (e.ctrlKey || e.metaKey) return

      // Tab: always grab it before the browser shifts focus.
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        onTab?.()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onEnter()
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        // preventDefault keeps the sentinel space intact in the hidden input.
        e.preventDefault()
        e.stopPropagation()
        onDelete()
        return
      }

      // Alt/Option key: the OS would otherwise compose the resulting character
      // (e.g. Option+o → ø) into the hidden input, causing an 'input' event
      // that bypasses our validation. preventDefault stops that composition;
      // we still validate the key's character against the Turkish alphabet so
      // users on Turkish Q/F layouts can type ş/ğ/etc. via their Alt combos.
      if (e.altKey) {
        if (e.key.length === 1 && e.key !== ' ') {
          e.preventDefault()
          e.stopPropagation()
          const upper = e.key.toLocaleUpperCase('tr-TR')
          if (VALID_LETTERS.has(upper)) {
            onChar(upper)
          } else {
            onInvalidKey?.()
          }
        }
        return
      }

      // Regular printable character.
      if (e.key.length === 1 && e.key !== ' ') {
        const upper = e.key.toLocaleUpperCase('tr-TR')
        if (VALID_LETTERS.has(upper)) {
          // preventDefault stops the char from also going into the hidden input
          // and firing a duplicate 'input' event. stopPropagation prevents
          // browser extensions from intercepting game keystrokes.
          e.preventDefault()
          e.stopPropagation()
          onChar(upper)
        } else {
          onInvalidKey?.()
        }
      }
      // All other keys (arrows, Escape, F-keys, space, bare modifiers) are
      // silently ignored — no preventDefault, no onInvalidKey.
    }

    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [disabled, isActive, onChar, onDelete, onEnter, onTab, onInvalidKey])

  // ── Mobile Keyboard (Hidden Input) ────────────────────────────────────────
  const handleNativeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (disabled || !isActive) return
    const ne = e.nativeEvent as InputEvent
    
    if (ne.inputType === 'deleteContentBackward') {
      onDelete()
    } else if (ne.inputType === 'insertLineBreak') {
      // Android virtual keyboards often fire this instead of a form submit
      onEnter()
    } else if (ne.data) {
      // Note: mapping over characters in case multi-char input (autocorrect/swiping)
      const data = ne.data.toLocaleUpperCase('tr-TR')
      for (const char of data) {
        if (VALID_LETTERS.has(char)) {
          onChar(char)
        } else {
          onInvalidKey?.()
        }
      }
    }
    
    // Sentinel space trick:
    // Mobile keyboards only fire an 'input' event for backspace when there is
    // actually a character to delete — an empty input produces no event at all.
    // By resetting to ' ' after every input event, the next backspace always
    // has something to delete and therefore always triggers an event.
    // Safety: when the space is deleted, ne.inputType is 'deleteContentBackward',
    // which is handled in the first branch above — the space never reaches the
    // ne.data / character-validation path, so it cannot enter game state.
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = ' '
    }
  }, [disabled, isActive, onChar, onDelete, onEnter, onInvalidKey])

  // ── Focus Management ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isActive && !disabled) {
      const t = setTimeout(() => hiddenInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    } else {
      hiddenInputRef.current?.blur()
    }
  }, [isActive, disabled])

  return {
    hiddenInputRef,
    handleNativeInput,
  }
}
