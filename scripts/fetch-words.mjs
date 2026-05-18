/**
 * Fetches the full TDK (Türk Dil Kurumu) word list from the open-source
 * ncarkaci/TDKDictionaryCrawler repository (scraped directly from sozluk.gov.tr).
 *
 * Produces one file:
 *
 *   tdk-valid.json  — dictionary used for both target-word selection and
 *                     guess validation. Contains all TDK words that pass the
 *                     alphabet and blocklist filters, plus a hand-curated
 *                     supplement for words missing from the crawler snapshot.
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

// Valid Turkish lowercase alphabet — every character in a game word must be one of these.
const TR_ALPHA = new Set([...'abcçdefgğhıijklmnoöprsştuüvyz'])

// Words that pass alphabet filters but are inappropriate for a family game.
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
// ncarkaci/TDKDictionaryCrawler snapshot. Add entries here as players
// report false "geçersiz kelime" rejections.
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

  const tdkLines = tdkText.split('\n').map((l) => l.trim()).filter(Boolean)
  console.log(`TDK raw entries: ${tdkLines.length.toLocaleString()}`)

  const valid = { 4: [], 5: [], 6: [], 7: [] }

  for (const line of tdkLines) {
    // Skip multi-word phrases, slash-separated alternates, and hyphenated forms.
    if (line.includes(' ') || line.includes('/') || line.includes('-') || line.includes("'"))
      continue

    // Skip proper nouns (place names, languages, etc.)
    if (isProperNoun(line)) continue

    const word = removeCircumflex(line.toLocaleLowerCase('tr-TR'))

    if (!isPureTurkish(word)) continue
    if (BLOCKLIST.has(word)) continue

    const len = [...word].length
    if (len < 4 || len > 7) continue

    valid[len].push(word)
  }

  // Fold in supplement words.
  for (const word of SUPPLEMENT) {
    const len = [...word].length
    if (len >= 4 && len <= 7) valid[len].push(word)
  }

  // Deduplicate and sort.
  for (const len of [4, 5, 6, 7]) {
    const seen = new Set()
    valid[len] = valid[len]
      .filter((w) => { if (seen.has(w)) return false; seen.add(w); return true })
      .sort((a, b) => a.localeCompare(b, 'tr'))
  }

  const validPath = join(__dir, '../src/data/tdk-valid.json')
  writeFileSync(validPath, JSON.stringify(valid), 'utf8')

  console.log('\n── Dictionary (tdk-valid.json) ─────────────────────────────')
  for (const len of [4, 5, 6, 7]) {
    const sample = valid[len].slice(0, 5).join(', ')
    console.log(`  ${len}-letter: ${valid[len].length} words  (e.g. ${sample})`)
  }
  console.log(`\nSaved → ${validPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
