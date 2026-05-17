import { WORD_LISTS } from '../data/words'

// Build the set in uppercase (tr-TR) — the same transformation pickLocalWord uses,
// so the encoding of i/ı/İ/I is always consistent between target words and validation.
const validWordSet = new Set(
  (Object.values(WORD_LISTS) as [string, number][][])
    .flat()
    .map(([w]) => w.toLocaleUpperCase('tr-TR')),
)

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

