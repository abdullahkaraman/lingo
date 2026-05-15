import type { LetterStatus } from '../types/game'

/**
 * Evaluates a guess against a target word.
 * Handles repeated letters correctly using a two-pass algorithm.
 */
export function evaluateGuess(guess: string, targetWord: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(guess.length).fill('absent')
  const targetChars = targetWord.split('')
  const guessChars = guess.split('')

  // Track which target positions have been matched
  const targetMatched = new Array(targetWord.length).fill(false)
  const guessMatched = new Array(guess.length).fill(false)

  // First pass: find correct positions (green)
  for (let i = 0; i < guessChars.length; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct'
      targetMatched[i] = true
      guessMatched[i] = true
    }
  }

  // Second pass: find present letters (yellow)
  for (let i = 0; i < guessChars.length; i++) {
    if (guessMatched[i]) continue

    for (let j = 0; j < targetChars.length; j++) {
      if (targetMatched[j]) continue
      if (guessChars[i] === targetChars[j]) {
        result[i] = 'present'
        targetMatched[j] = true
        break
      }
    }
  }

  return result
}
