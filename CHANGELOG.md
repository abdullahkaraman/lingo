# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-17

### Added
- Word-length selection screen (4 / 5 / 6 / 7 letters) shown before each game session
- Per-row timer selection slider on the setup screen (10 – 20 seconds, default 12 s)
- Mobile native keyboard support — device keyboard replaces the on-screen one on mobile
- Voice input via Web Speech API (`tr-TR`) on both mobile and desktop
- One-tap clear button (⌫) clears the entire current row back to the locked first letter
- Build version stamp in the URL (`?v=YYYYMMDD-HHmm`) so local and deployed builds can be compared at a glance
- Per-player word history stored in `localStorage` — a word that has already appeared will not be shown again; each word-length bucket resets independently when exhausted

### Changed
- Dictionary quality: TDK word list is now cross-referenced with an OpenSubtitles 2018 Turkish frequency corpus; only words with ≥ 30 corpus occurrences are kept, removing archaic and highly specialised vocabulary
- Word selection is frequency-weighted (`√count`) so common words appear more often without extreme skew from raw counts
- Dictionary validation is now fully offline — replaced the TDK network API call with an instant O(1) lookup against the bundled word list, eliminating game freezes on poor or no internet connection; bundle size reduced by ~47 KB as a side effect
- Layout uses `position: fixed; inset: 0` to pin both the setup and game views to exactly 100 vh with no scrolling on iOS Safari

### Fixed
- Mobile scroll: active guess row scrolls into view after each submission (accounts for native keyboard covering the lower portion of the screen)
- iOS upward scroll on input focus — hidden input repositioned to `top: 50%; left: -9999px` to prevent Safari from scrolling the page when focusing
- Setup page no longer overflows on small phone screens

### Security
- Added blocklist to filter inappropriate words from the game word pool

---

## [0.1.0] - 2026-04-01

### Added
- Initial Turkish Lingo word-guessing game
- 5 attempts per word with colour-coded letter feedback (correct / present / absent)
- 12-second countdown timer per row
- On-screen Turkish keyboard
- Score system (2000 → 400 points depending on attempt used)
- Round result modal showing the target word and session stats
