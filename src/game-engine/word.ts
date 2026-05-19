import tdkData from '../data/tdk-valid.json'
import type { WordLength } from './types'

const GAME_WORDS = (tdkData as unknown as { game: Record<number, string[]> }).game

// FNV-1a 32-bit hash — fast, dependency-free, uniform distribution.
function fnv1a(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/**
 * Deterministically picks a word from the game pool.
 * Same seed + round + wordLength always produces the same word,
 * so both players in a room see the same target without any coordination.
 */
export function pickWord(wordLength: WordLength, seed: string, round: number): string {
  const pool = GAME_WORDS[wordLength] ?? []
  if (pool.length === 0) throw new Error(`No game words for length ${wordLength}`)
  const idx = fnv1a(`${seed}:${round}:${wordLength}`) % pool.length
  return pool[idx].toLocaleUpperCase('tr-TR')
}
