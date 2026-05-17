import { VALID_WORDS } from '../data/validWords'

// All TDK words uppercased — same transform as pickLocalWord uses for target words.
const validWordSet = new Set(
  (Object.values(VALID_WORDS) as string[][])
    .flat()
    .map((w) => w.toLocaleUpperCase('tr-TR')),
)

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

