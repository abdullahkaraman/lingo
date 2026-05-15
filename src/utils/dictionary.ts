import tdk from 'tdk-sozluk'

/**
 * Checks whether a word exists in the TDK Güncel Türkçe Sözlük.
 * TDK API expects lowercase Turkish input (i → i, I → ı handled by toLocaleLowerCase).
 * On network failure, fails open (returns true) so the game stays playable offline.
 */
export async function isValidWord(word: string): Promise<boolean> {
  try {
    const results = await tdk.guncel(word.toLocaleLowerCase('tr-TR'))
    return Array.isArray(results) && results.length > 0
  } catch {
    // Fail open: don't penalise the player if TDK is unreachable.
    return true
  }
}

/**
 * Fetches a random word of the given length from TDK's "günün kelimesi" endpoint
 * and verifies it exists in the main dictionary.
 * Returns null if the word-of-the-day is the wrong length or the call fails.
 */
export async function fetchTdkWordOfDay(length: number): Promise<string | null> {
  try {
    const items = await tdk.icerik.gununKelimesi()
    if (!items || items.length === 0) return null
    const word = items[0].madde
    if (!word) return null
    const upper = word.toLocaleUpperCase('tr-TR').trim()
    if ([...upper].length !== length) return null
    return upper
  } catch {
    return null
  }
}
