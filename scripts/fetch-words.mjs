/**
 * Fetches the full TDK (Türk Dil Kurumu) word list from the open-source
 * ncarkaci/TDKDictionaryCrawler repository (scraped directly from sozluk.gov.tr),
 * then cross-references with an OpenSubtitles Turkish word-frequency corpus.
 *
 * Produces two files:
 *
 *   tdk-words.json  — game word pool (freq ≥ FREQ_MIN).
 *                     Only common, everyday words become target words so players
 *                     are never asked to guess something obscure.
 *
 *   tdk-valid.json  — validation dictionary (all TDK words, no frequency gate).
 *                     Any word that exists in the TDK dictionary and uses only
 *                     Turkish alphabet characters is accepted as a valid guess,
 *                     even if it is rare (e.g. "hitap", "veciz", …).
 *
 * Usage:
 *   node scripts/fetch-words.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const TDK_URL =
  'https://raw.githubusercontent.com/ncarkaci/TDKDictionaryCrawler/master/' +
  'TDK_S%C3%B6zl%C3%BCk_Kelime_Listesi.txt'

// OpenSubtitles 2018 Turkish corpus — full frequency list (word<space>count per line)
const FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/tr/tr_full.txt'

// Minimum number of corpus occurrences a word must have to enter the game pool.
// 200 cuts the low-frequency tail (niche/technical/archaic words) while keeping
// ~4 600 everyday words across the four length buckets.
const FREQ_MIN = 200

// Valid Turkish lowercase alphabet — every character in a game word must be one of these.
const TR_ALPHA = new Set([...'abcçdefgğhıijklmnoöprsştuüvyz'])

// Words that pass alphabet/frequency filters but are inappropriate for a family game.
const BLOCKLIST = new Set([
  // Turkish vulgar / offensive
  'ibne', 'orospu', 'fahişe', 'kaltak', 'yavşak', 'gavat', 'peştemal',
  'sikiş', 'sikme', 'sikik', 'sikim', 'siken', 'sikerim',
  'piçlik', 'piçler', 'oçsuz',
  'götveren', 'götoğlanı',
  // Loanwords used as profanity or adult content
  'porn', 'porno', 'seks', 'erotik', 'escort',
])

// Words confirmed to be in TDK sozluk.gov.tr but absent from the
// ncarkaci/TDKDictionaryCrawler snapshot. Added to tdk-valid.json only
// (not the game pool). Add entries here as players report false rejections.
const SUPPLEMENT = ['dart']

// TDK stores some loanwords with Ottoman circumflex marks (â, î, û).
// Modern Turkish usage drops them; normalise before any other processing.
function removeCircumflex(word) {
  return word.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
}

function isProperNoun(word) {
  return word[0] !== word[0].toLocaleLowerCase('tr-TR')
}

function isPureTurkish(word) {
  return [...word].every((c) => TR_ALPHA.has(c))
}

async function main() {
  console.log('Fetching TDK word list…')
  const tdkRes = await fetch(TDK_URL)
  if (!tdkRes.ok) throw new Error(`TDK HTTP ${tdkRes.status}`)
  const tdkText = await tdkRes.text()

  console.log('Fetching Turkish frequency corpus…')
  const freqRes = await fetch(FREQ_URL)
  if (!freqRes.ok) throw new Error(`Frequency corpus HTTP ${freqRes.status}`)
  const freqText = await freqRes.text()

  // Build word → count map from the frequency corpus.
  const freqMap = new Map()
  for (const line of freqText.split('\n')) {
    const space = line.indexOf(' ')
    if (space === -1) continue
    const word = line.slice(0, space).trim().toLocaleLowerCase('tr-TR')
    const count = parseInt(line.slice(space + 1), 10)
    if (word && !isNaN(count)) freqMap.set(word, count)
  }
  console.log(`Frequency corpus: ${freqMap.size.toLocaleString()} entries`)

  const tdkLines = tdkText.split('\n').map((l) => l.trim()).filter(Boolean)
  console.log(`TDK raw entries: ${tdkLines.length.toLocaleString()}`)

  // game[len]  = [word, count] pairs for target-word pool (freq ≥ FREQ_MIN)
  // valid[len] = word strings for validation dictionary (all TDK words)
  const game  = { 4: [], 5: [], 6: [], 7: [] }
  const valid = { 4: [], 5: [], 6: [], 7: [] }

  for (const line of tdkLines) {
    // Skip multi-word phrases, slash-separated alternates, and hyphenated forms.
    if (line.includes(' ') || line.includes('/') || line.includes('-') || line.includes("'"))
      continue

    // Skip proper nouns (place names, languages, etc.)
    if (isProperNoun(line)) continue

    const word = removeCircumflex(line.toLocaleLowerCase('tr-TR'))

    // Keep only pure Turkish-alphabet words.
    if (!isPureTurkish(word)) continue

    // Blocklist filter — remove inappropriate words from both lists.
    if (BLOCKLIST.has(word)) continue

    const len = [...word].length
    if (len < 4 || len > 7) continue

    // Validation list: every TDK word that passes alphabet + blocklist checks.
    valid[len].push(word)

    // Game word pool: additionally requires minimum corpus frequency.
    const count = freqMap.get(word) ?? 0
    if (count >= FREQ_MIN) {
      game[len].push([word, count])
    }
  }

  // Fold in supplement words (valid only, not game pool).
  for (const word of SUPPLEMENT) {
    const len = [...word].length
    if (len >= 4 && len <= 7) valid[len].push(word)
  }

  // Deduplicate and sort both buckets.
  for (const len of [4, 5, 6, 7]) {
    const dedup = (arr) => {
      const seen = new Set()
      return arr.filter((item) => {
        const key = Array.isArray(item) ? item[0] : item
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }
    game[len]  = dedup(game[len]).sort(([a], [b]) => a.localeCompare(b, 'tr'))
    valid[len] = dedup(valid[len]).sort((a, b) => a.localeCompare(b, 'tr'))
  }

  const wordsPath = join(__dir, '../src/data/tdk-words.json')
  const validPath = join(__dir, '../src/data/tdk-valid.json')
  writeFileSync(wordsPath, JSON.stringify(game), 'utf8')
  writeFileSync(validPath, JSON.stringify(valid), 'utf8')

  console.log('\n── Game word pool (tdk-words.json) ─────────────────────────')
  for (const len of [4, 5, 6, 7]) {
    const sample = game[len].slice(0, 5).map(([w]) => w).join(', ')
    console.log(`  ${len}-letter: ${game[len].length} words  (e.g. ${sample})`)
  }
  console.log('\n── Validation dictionary (tdk-valid.json) ──────────────────')
  for (const len of [4, 5, 6, 7]) {
    const sample = valid[len].slice(0, 5).join(', ')
    console.log(`  ${len}-letter: ${valid[len].length} words  (e.g. ${sample})`)
  }
  console.log(`\nSaved → ${wordsPath}`)
  console.log(`Saved → ${validPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
