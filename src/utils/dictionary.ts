import { VALID_WORDS } from '../data/validWords'
import { EXTRA_WORDS } from '../data/extra-words'

// All TDK words + supplementary list, uppercased — same transform as pickLocalWord.
const validWordSet = new Set([
  ...(Object.values(VALID_WORDS) as string[][]).flat(),
  ...EXTRA_WORDS,
].map((w) => w.toLocaleUpperCase('tr-TR')))

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

