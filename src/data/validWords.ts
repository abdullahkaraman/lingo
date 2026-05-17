import tdkValid from './tdk-valid.json'

// All TDK dictionary words that pass alphabet and blocklist filters.
// Used for guess validation — broader than the game word pool.
export const VALID_WORDS: Record<number, string[]> = tdkValid as unknown as Record<number, string[]>
