/**
 * Fetches the full TDK (Türk Dil Kurumu) word list from the open-source
 * ncarkaci/TDKDictionaryCrawler repository (scraped directly from sozluk.gov.tr),
 * then cross-references with an OpenSubtitles Turkish word-frequency corpus.
 *
 * Produces one file with two sections:
 *
 *   tdk-valid.json
 *     .game[len]  — target-word pool (freq ≥ FREQ_MIN, plain string array).
 *                   Only common, everyday words become target words.
 *     .valid[len] — validation dictionary (all TDK words, no frequency gate).
 *                   Any real TDK word is accepted as a valid guess.
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

// Minimum corpus occurrences to enter the game pool.
const FREQ_MIN = 200

// Valid Turkish lowercase alphabet.
const TR_ALPHA = new Set([...'abcçdefgğhıijklmnoöprsştuüvyz'])

// Words inappropriate for a family game.
const BLOCKLIST = new Set([
  'ibne', 'orospu', 'fahişe', 'kaltak', 'yavşak', 'gavat', 'peştemal',
  'sikiş', 'sikme', 'sikik', 'sikim', 'siken', 'sikerim',
  'piçlik', 'piçler', 'oçsuz',
  'götveren', 'götoğlanı',
  'porn', 'porno', 'seks', 'erotik', 'escort',
])

// Words confirmed in TDK sozluk.gov.tr but absent from the crawler snapshot.
// Add entries here as players report false "geçersiz kelime" rejections.
const SUPPLEMENT = ['dart']

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

  const game  = { 4: [], 5: [], 6: [], 7: [] }
  const valid = { 4: [], 5: [], 6: [], 7: [] }

  for (const line of tdkLines) {
    if (line.includes(' ') || line.includes('/') || line.includes('-') || line.includes("'"))
      continue
    if (isProperNoun(line)) continue

    const word = removeCircumflex(line.toLocaleLowerCase('tr-TR'))

    if (!isPureTurkish(word)) continue
    if (BLOCKLIST.has(word)) continue

    const len = [...word].length
    if (len < 4 || len > 7) continue

    valid[len].push(word)

    const freq = freqMap.get(word) ?? 0
    if (freq >= FREQ_MIN) {
      game[len].push([word, freq])
    }
  }

  // Fold in supplement words (valid only).
  for (const word of SUPPLEMENT) {
    const len = [...word].length
    if (len >= 4 && len <= 7) valid[len].push(word)
  }

  // Deduplicate and sort both sections.
  const dedup = (arr) => {
    const seen = new Set()
    return arr.filter((w) => { if (seen.has(w)) return false; seen.add(w); return true })
  }
  for (const len of [4, 5, 6, 7]) {
    // Sort by frequency descending so the game can apply positional weights.
    const seen = new Set()
    game[len] = game[len]
      .sort(([, fa], [, fb]) => fb - fa)
      .filter(([w]) => seen.has(w) ? false : (seen.add(w), true))
      .map(([w]) => w)
    valid[len] = dedup(valid[len]).sort((a, b) => a.localeCompare(b, 'tr'))
  }

  const outPath = join(__dir, '../src/data/tdk-valid.json')
  writeFileSync(outPath, JSON.stringify({ game, valid }), 'utf8')

  console.log('\n── Game pool (.game) ───────────────────────────────────────')
  for (const len of [4, 5, 6, 7]) {
    console.log(`  ${len}-letter: ${game[len].length} words  (e.g. ${game[len].slice(0, 5).join(', ')})`)
  }
  console.log('\n── Validation dictionary (.valid) ──────────────────────────')
  for (const len of [4, 5, 6, 7]) {
    console.log(`  ${len}-letter: ${valid[len].length} words  (e.g. ${valid[len].slice(0, 5).join(', ')})`)
  }
  console.log(`\nSaved → ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
