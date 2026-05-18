import tdkValid from '../data/tdk-valid.json'
import { EXTRA_WORDS } from '../data/extra-words'

const validWordSet = new Set([
  ...(Object.values(tdkValid) as string[][]).flat(),
  ...EXTRA_WORDS,
].map((w) => w.toLocaleUpperCase('tr-TR')))

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

