import tdkData from '../data/tdk-valid.json'

const validWordSet = new Set(
  (Object.values((tdkData as unknown as { valid: Record<number, string[]> }).valid) as string[][])
    .flat()
    .map((w) => w.toLocaleUpperCase('tr-TR'))
)

// word arrives already uppercase-normalised (from normalize() in submitGuess)
export function isValidWord(word: string): boolean {
  return validWordSet.has(word)
}

