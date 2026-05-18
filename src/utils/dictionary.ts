import tdkValid from '../data/tdk-valid.json'

const validWordSet = new Set(
  (Object.values(tdkValid) as string[][]).flat().map((w) => w.toLocaleUpperCase('tr-TR'))
)

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

