import { WORD_LISTS } from '../data/words'

// Build a flat lowercase set from the bundled word list — O(1) lookup, fully offline.
const validWordSet = new Set(
  (Object.values(WORD_LISTS) as [string, number][][])
    .flat()
    .map(([w]) => w.toLocaleLowerCase('tr-TR')),
)

export function isValidWord(word: string): boolean {
  return validWordSet.has(word.toLocaleLowerCase('tr-TR'))
}

