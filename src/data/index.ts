import tdkData from './tdk-valid.json'

/**
 * Frequency-sorted word pools keyed by length (4–7).
 * Used for word selection in solo, multiplayer, and passaparola modes.
 */
export const GAME_WORDS = (tdkData as unknown as { game: Record<number, string[]> }).game

/**
 * Validation pools keyed by length.
 * Used by the dictionary module for isValidWord lookups.
 */
export const VALID_WORDS = (tdkData as unknown as { valid: Record<number, string[]> }).valid
