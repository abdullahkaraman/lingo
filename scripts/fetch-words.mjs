/**
 * Fetches the full TDK (Türk Dil Kurumu) word list from the open-source
 * ncarkaci/TDKDictionaryCrawler repository (scraped directly from sozluk.gov.tr),
 * then cross-references with an OpenSubtitles Turkish word-frequency corpus to
 * keep only words that appear at least FREQ_MIN times in real usage.
 *
 * This removes archaic, dialectal, and highly specialised words (e.g. "keler",
 * "utçu") while retaining everyday vocabulary.
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

// Minimum number of corpus occurrences a word must have to be included.
// Tested against known-obscure words (keler:18, utçu:0) and known-common words
// (okul:24073, araba:49407) — 30 is a clean cut point.
const FREQ_MIN = 30

// Valid Turkish lowercase alphabet — every character in a game word must be one of these.
const TR_ALPHA = new Set([...'abcçdefgğhıijklmnoöprsştuüvyz'])

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

  const result = { 4: [], 5: [], 6: [], 7: [] }

  for (const line of tdkLines) {
    // Skip multi-word phrases, slash-separated alternates, and hyphenated forms.
    if (line.includes(' ') || line.includes('/') || line.includes('-') || line.includes("'"))
      continue

    // Skip proper nouns (place names, languages, etc.)
    if (isProperNoun(line)) continue

    const word = line.toLocaleLowerCase('tr-TR')

    // Keep only pure Turkish-alphabet words.
    if (!isPureTurkish(word)) continue

    // Frequency filter — remove archaic / rare words.
    if ((freqMap.get(word) ?? 0) < FREQ_MIN) continue

    const len = [...word].length
    if (len >= 4 && len <= 7) {
      result[len].push(word)
    }
  }

  // Deduplicate each bucket.
  for (const len of [4, 5, 6, 7]) {
    result[len] = [...new Set(result[len])].sort()
  }

  const outPath = join(__dir, '../src/data/tdk-words.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')

  console.log()
  for (const len of [4, 5, 6, 7]) {
    const sample = result[len].slice(0, 5).join(', ')
    console.log(`  ${len}-letter: ${result[len].length} words  (e.g. ${sample})`)
  }
  console.log(`\nSaved → ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
