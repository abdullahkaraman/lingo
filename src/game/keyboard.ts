import { GuessRow, LetterStatus } from './types'

/**
 * Computes the best-known status for each letter based on all submitted guesses.
 * Used for coloring the on-screen keyboard.
 */
export function computeLetterStatuses(rows: GuessRow[]): Record<string, LetterStatus> {
  const map: Record<string, LetterStatus> = {}
  for (const row of rows) {
    if (!row.submitted) continue
    for (const l of row.letters) {
      if (!l.char) continue
      const cur = map[l.char]
      
      // 'correct' is the highest status, don't override it.
      if (cur === 'correct') continue
      
      // If current is 'present', only 'correct' can override it.
      if (l.status === 'correct' || !cur) {
        map[l.char] = l.status
        continue
      }
      
      if (l.status === 'present') {
        map[l.char] = 'present'
      }
    }
  }
  return map
}
