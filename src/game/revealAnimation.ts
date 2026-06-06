import { REVEAL_STAGGER_MS, REVEAL_END_DELAY_MS } from './constants'

/**
 * Total duration of the tile-reveal flip animation for a word of the given length.
 */
export function getRevealDuration(wordLength: number): number {
  return (wordLength - 1) * REVEAL_STAGGER_MS + REVEAL_END_DELAY_MS
}
