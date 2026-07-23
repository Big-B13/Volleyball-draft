# STATE.md — Project Continuity Protocol

> **Single source of truth.** Any agent (or human) joining this project reads this file
> *first*, in full, before touching anything else. If it isn't written here, it didn't happen.

---

## 🔒 The Protocol (static — read every session)

1. **Read this file first.** No edits before understanding Status, Bugs, and Next Actions.
2. **Verify before you trust.** Trust code over comments, tests over claims, reproduction over bug reports.
3. **One fix at a time.** Reproduce → isolate root cause → fix → re-verify → record. Then move on.
4. **No silent changes.** Every change updates this file in the same session: Status, Bugs, Session Log, Next Actions.
5. **The Decision Log is append-only.** Never delete a decision — supersede it with a new entry that references the old one.
6. **Bugs are closed only with evidence:** root cause + fix description + how it was verified. Anything else stays `OPEN` or `UNCONFIRMED`.

---

## 🎯 Mission

1. Keep Volleyball-draft healthy: fix predecessor bugs with verify-then-trust discipline. ✅ (first pass complete)
2. Build the story system: cutscene engine → chapter intros → choices → consequences (Phases 1–3). **Phase 1 shipped 2026-07-23.**

---

## 📊 Current Status

- **Project:** [Big-B13/Volleyball-draft](https://github.com/Big-B13/Volleyball-draft/tree/Development) (branch `Development`, cloned to `/home/user/Volleyball-draft`)
- Stack: static HTML + ES modules (`js/`), Firebase auth/DB, no build step, GitHub Pages hosting.
- **2026-07-23** — Fresh-eyes audit DONE. All 4 reported bugs reproduced with root causes (see table). Fixes in progress.

---

## 🐞 Known Bugs

| ID | Symptom | Root cause | Fix | Verified by | Status |
|----|---------|-----------|-----|-------------|--------|
| B1 | Pack animation broken | New cinematic (pack-opening-system.js) + legacy modal (`showPackReveal`) both fire → double reveal; cards grid not centered (`auto-fit` columns + fixed-width card → hugs left); vertical overflow on small screens; label says HOLD but click opens | Center/limit grid, scroll-safe stage, merge duplicate-info into cinematic, drop redundant legacy modal in normal flow | syntax check + node smoke test (32/32 pass) | **FIXED** (needs in-browser confirmation) |
| B2 | Second-in-command always Bader regardless of club | `gomiSelectedClub` is NEVER written anywhere (only read); onboarding saves club to Firebase profile only → `state.club=null` → `playerClub()` falls back to `'strigidae'` → every lookup (store, keeper, chapter-5, guide) resolves to Strigidae/Bader | Persist club at onboarding (`completeOnboarding`), one-time club picker in campaign init to heal existing players | grep: zero `setItem('gomiSelectedClub')` in repo; node test: all 3 clubs resolve to correct keeper/portrait/accent | **FIXED** (needs in-browser confirmation) |
| B3 | No cutscenes/lore visible anywhere | (a) `showLoadingSequence()` was rewritten to 3 hardcoded generic screens, ignoring the 200-line club lore DB (`LOADING_SEQUENCES`) — and screen 3 is always Night's Counter (also feeds B2). (b) Club guide intro cutscenes (`RELATIONSHIPS.clubGuides` + `getClubGuide`) are dead code, never called | Rebuilt loading sequence per LOADING_SEQUENCE_README.md spec (mentor→keeper→captain shuffled, portraits+quotes, 10s full / 2.5s quick, tap-to-skip); guide-intro cutscene wired on first campaign entry | syntax check; node test: lore present per club, guide intros load | **FIXED** (needs in-browser confirmation) |
| B4 | Store layout broken | **Bonus find:** `#tab-shop` backdrop hardcoded to `otter-box.jpeg` for ALL clubs. `.shop-item` base grid = 3 columns but holds 4 children (odds wrap); items crushed into narrow multi-column grid with row layout; off-theme hardcoded brown | Single-column item cards, full-width buy button, full-width odds, per-club backdrop + `--store-accent` theming set from `renderShop` | syntax check; node test accent mapping | **FIXED** (needs in-browser confirmation) |

| B5 | Blank page after deploy (2026-07-23 evening) | **Not a code bug: partial deploy.** `js/cutscene-player.js` + `js/story/` 404'd on the server (new files never uploaded); static ES-module imports are all-or-nothing → one 404 → whole inline module dead → blank page. favicon 404 = harmless | (a) Story system converted to lazy `import()` add-on — campaign runs with or without it; (b) `seen` marked only AFTER a scene actually plays; (c) favicon silenced; (d) `DEPLOYMENT.md` checklist added | screenshot console diagnosis + syntax check + module-graph reasoning | **FIXED** (needs user's re-upload + in-browser pass) |

| B6 | Otters save still shows Bader/Zakhar; "No pack owned" error despite owning a pack; guide lore before tutorial (2026-07-23 night) | **Two live villains:** (1) pre-fix code stamped `club:'strigidae'` into every existing save (local + cloud) as a silent default — my first heal couldn't tell poisoned-strigidae from real-strigidae; (2) cloud load on init **unconditionally overwrote** local state ~1s after entry: picker choice + pack buys stomped back to the stale poisoned cloud copy. Bonus: guide cutscene fired before tutorial | (a) saves now stamped `updatedAt`; cloud reconcile = fresher save wins, loser heals; (b) explicit club choice (onboarding/picker) ALWAYS outranks save content; (c) club chip in header with click-to-repick = deterministic manual heal; (d) tutorial first, guide welcome cutscene after; (e) pack-open failure now toasts + re-renders instead of alert | stomp scenario simulated against real store code: 4/4 node checks; syntax checks | **FIXED** (needs deploy + in-browser confirmation) |

| B7 | Dashboard stalls at "Loading…", Power 0; console: `teamPower` TypeError `reading 'map'` (2026-07-23 night) | Old-schema/corrupt save (from June builds / earlier test accounts) has `roster` without `starters[]`. `loadCampaign()` normalized inventory/pity/etc. but **never roster/ownedCards** → `teamPower` crashed → `render()` aborted mid-way → page stuck. Original code had the same hole; user only reached it now | (a) `loadCampaign` guarantees `ownedCards{}`, `roster{starters[],bench[]}`, numeric coins; (b) `teamPower` fully defensive (bad input → 0, never throws); (c) `init()` bootstrap wrapped: failure now shows an on-page error banner instead of silent stall | node: 4 malformed-save variants survive load+render math, fresh save intact, 6/6 | **FIXED** (needs deploy + in-browser confirmation) |

| B8 | Store art wrong per club: Night's Counter showed The Otter Box mural, Otter Box showed The Shizuka Cafe, Cafe showed a pack-reveal screenshot (2026-07-23 night) | `assets/store/night-counter.jpeg` / `otter-box.jpeg` / `cafe.jpeg` files were scrambled earlier in production (sha256 hash proof vs git HEAD); `cafe.jpeg` was an accidentally-saved screenshot | cafe ← user's real Shizuka art; otter-box ← true mural recovered from git history; **night-counter = city.jpeg placeholder** until real art arrives | hash comparison + reopened each image visually | **FIXED** (placeholder in use — needs real Night's Counter art + in-browser confirmation) |

| B9 | Browser scrollbars (vertical + horizontal) paint over the pack-opening cinematic (user screenshot 2026-07-23) | All three fullscreen overlays (`gomi-pack-overlay`, `gomi-cs-overlay`, `campaign-loading-overlay`) are `position:fixed`, but nothing locks the scrollable document behind them → the browser's root scrollbars stay visible on top of the cinematic | Save/restore scroll lock: on open, set `overflow:hidden` on `<html>` + `<body>` (saving old values); restore on close. Nested save/restore stacks correctly (loading → cutscene etc.) | node DOM-stub sim: **15/15** — locked on open, restored on close for pack + cutscene + loading | **FIXED** (needs deploy + in-browser confirmation) |

---

## 🧭 Decision Log (append-only)

| Date | Decision | Why | Supersedes |
|------|----------|-----|-----------|
| 2026-07-23 | Adopt `STATE.md` as the single source of truth | Agent sessions start with zero memory; continuity must live on disk, not in chat | — |
| 2026-07-23 | Add-ons load via lazy `import()`; core systems stay static. Incident B5 pattern documented in `DEPLOYMENT.md` | One 404 in a static import graph blanks the whole page; add-ons must degrade gracefully | — |
| 2026-07-23 | Save authority = EXPLICIT club choice (localStorage from onboarding/picker/chip) > save content. Cloud reconcile by `updatedAt`, fresher heals staler — never blind overwrite | B6: silent defaults poisoned old saves; blind cloud stomp erased fresh actions. Both are now impossible by construction | — |
| 2026-07-23 | Loading cinematic = 4 slides × 4s (16s) full / 3 × ~0.8s quick; club establishing slide first, characters shuffled after | User art direction; batch images land in `assets/loading/` and map per slide | — |
| 2026-07-23 | `assets/store/night-counter.jpeg` is a **placeholder** (`city.jpeg` copy) until real Night's Counter art arrives | All three store images were mislabeled at repo level (hash-proven); real Night's Counter art never existed in repo | — |

## ⏳ Waiting on user

- **Night's Counter store art** (Strigidae) → drop at `assets/store/night-counter.jpeg` (1600×900-ish jpeg works)
- **Loading gallery batches 3+** → batches 1+2 installed: series now covers 01–31 + 33 (31 slides installed). Remaining gaps: 09, 32, 34+? — send with same naming (`loading_NN_<id>_widescreen.png`); still expected but missing: diego, debora, jackets, joris
| 2026-07-23 | Club identity: onboarding writes `gomiSelectedClub` + one-time picker heals old saves | Club was only in Firebase profile, never readable by campaign code; asking once beats silent wrong-club fallback | — |
| 2026-07-23 | Pack cinematic is the single reveal; legacy `showPackReveal` kept ONLY for the tutorial (needs its "CONTINUE GUIDE" button) | Double reveal looked broken; guide flow must not break | — |
| 2026-07-23 19:57 | Story = data-driven scripts (`js/story/chapter-XX.js`) + one engine (`js/cutscene-player.js`); speaker tokens (`keeper/mentor/captain`) resolve via `relationships.js` so one script auto-plays in 3 club voices | Writer-friendly; no code needed to add scenes; no duplication per club | — |
| 2026-07-23 19:57 | Phase 1 choices branch dialogue but write NO flags/affinity yet | Consequence layer (`state.story.flags/affinity`) is Phase 2 scope; keeps Phase 1 replayable and save-safe | — |
| 2026-07-23 19:57 | Intro plays on first chapter *view* (unlocked), tracked in `state.story.seen`; "📖 REPLAY INTRO" button in chapter header | Least surprising trigger; rewatchable forever | — |
| 2026-07-23 | Rival names in scripts are canon-locked to `CHAPTER_RIVALS` values at time of writing | Scripts are lore documents; if rivals data changes, sync the affected chapter file | — |

## ⛈ Landmines (known, not yet fixed — handle with care)

- **Old saves carry schema rot** (B7 class): they load now, but may show empty rosters/missing history. If a save looks hollow after these fixes, use **Reset** for a clean campaign — don't try to salvage it by hand.
- Editing `STATE.md`: never anchor search/replace on the `## 🧭 Decision Log` heading (eaten 3×); anchor on the table header row instead.
- **Workspace snapshots roll back git commits + generated files between turns (TWICE on 2026-07-23).** Observed: `.git` resets to an older HEAD (commits vanish), generated files (JPG conversions) vanish, BUT text edits to existing files, STATE.md, `/home/user/uploads/`, and finished zips survive. Protocol: **(1)** every turn opens with `git log --oneline -3` + disk-check of generated assets before building on them; **(2)** treat every turn as atomic — edit → verify → commit → rebuild zip in the SAME turn, never leave work "committed but unzipped" for next turn; **(3)** the zip is the durable deliverable, commits are convenience; **(4)** anything derivable (conversions) regenerates from uploads; check the zip's file count against expectation before presenting.

- Root-level `lore.js`, `data.js`, `reveal.js`, `setup.js` are identical duplicates of `js/` versions; **`auth.js` DIFFERS between root and `js/`** — only the `js/` copies are imported by pages. Edit `js/` only, consider deleting root dupes later.
- Chapter 5 is *labeled* "Second-in-Command" but `CHAPTER_RIVALS` doesn't actually field bader/aiden/zandorah as opponents — design gap, not one of today's bug reports.
- `STATE.md` lives in the workspace, not the repo — copy it into the repo if the team should see it.

---

## ✅ Fresh-Eyes Audit Checklist (run on project handover)

- [ ] Inventory all files; map the structure
- [ ] Run the project / its tests *as-is*; record failures verbatim
- [ ] Grep for predecessor landmines: `TODO`, `FIXME`, `HACK`, `XXX`, "temporary", "for now"
- [ ] For each reported bug: **reproduce first, fix second** — never fix blind
- [ ] After each fix: confirm the bug is gone AND no regressions
- [ ] Update this file before ending the session

---

## 📝 Session Log

- **2026-07-23 (agent)** — Created this protocol. Awaiting the existing project to begin the fresh-eyes audit.
- **2026-07-23 (agent)** — Cloned `Development` @ `37ac314`. Full audit: 4 bugs confirmed + root-caused. Fixed all 4 (`js/auth.js`, `campaign.html`, `js/campaign-loading.js`, `js/pack-opening-system.js`). Verification: syntax checks on all touched files, 17/17 referenced assets exist, 32/32 node logic tests pass (all 3 clubs resolve correct keeper/portrait/accent/lore/guide/ch5-opponent). Local commit `b03d1de` on `Development` — **user must `git push`** (no credentials here).
- **2026-07-23 19:57 (agent)** — **PHASE 1 STORY SYSTEM SHIPPED.** New: `js/cutscene-player.js` (visual-novel engine: letterbox, Ken Burns bg, typewriter, choice nodes, ESC/skip), `js/story/chapter-01..09.js` (9 intros × 3 club voices; ch5 = flagship with 3-way choice: bold/why/seen), `js/story/index.js` registry. Wired into `campaign.html` (first chapter view + replay button). Verification: syntax OK (11 files), custom validator **405/405** (scene graphs walkable, gotos valid, tokens resolve per club, 9/9 speaker→portrait files on disk). Chapter 1 quote-mismatch bug caught pre-commit by syntax check. Awaiting user's in-browser pass before Phase 2.
- **2026-07-23 ~21:00 (agent)** — **INCIDENT B5:** user deployed and got a blank page (screenshot: 404s on `js/cutscene-player.js`, `js/story/index.js`). Diagnosis: partial deploy — the 11 new story files never reached the server; static module graph made it fatal. Response: safety net built (story = lazy `import()` with graceful skip; seen-flag after successful play; favicon silenced) + `DEPLOYMENT.md` checklist. Zip rebuilt.
- **2026-07-23 night (agent)** — **Loading gallery batch 1 installed (24 slides).** PNG→JPEG conversion 52MB→5.5MB (progressive q84, loads just-in-time per slide). `GALLERY_FILES` map in `js/campaign-loading.js` (alias table for lore-vs-data ids: gabshi→gabsche); slide captions pull name+nickname live from `data.js`. Composition: full 16s = club slide + 1 club character + 2 gallery slides (shuffled per load); quick = 3 from combined pool. Verification 11/11 (all files on disk, all nicknames resolve).
- **2026-07-23 night (agent)** — **Store art unscrambled (B8-class asset mess):** hash evidence proved `night-counter.jpeg` held The Otter Box mural, `otter-box.jpeg` held The Shizuka Cafe, and `cafe.jpeg` was an **accidentally-saved pack-reveal screenshot**. Fixed: cafe ← user's real Shizuka art (uploaded), otter-box ← the mural recovered from git history, **night-counter = `city.jpeg` PLACEHOLDER until the real art arrives** (pending user's batch). Also rebuilt loading cinematic to the new 16s format: establishing club slide + 3 shuffled characters, 4 slides × 4s (quick version unchanged ~2.5s). Files: `assets/store/*.jpeg`, `js/campaign-loading.js`, `LOADING_SEQUENCE_README.md`.
- **2026-07-23 night (agent)** — **B7 (old-schema save crash):** user's browser held a save whose `roster` lacked `starters[]`; `teamPower` crashed, `render()` aborted, dashboard stuck at "Loading…". Original code had this hole since June — nobody reached it before. Fix: `loadCampaign` guarantees roster/ownedCards shapes, `teamPower` can't throw on bad input, `init()` failure shows an on-page banner (fail-loud). Node sim 6/6.
- **2026-07-23 late night (agent)** — **LOADING GALLERY BATCH 2 INSTALLED (7 slides) + SECOND ROLLBACK RECOVERED.** New arrivals: `loading_01–07` = the three club mentors as coaches (zakhar "Guardian Angel", mandie "Scope", bouschra "Gazelle"), skuppa "DJ" (rooftop set 🎧), ihor "Header", ayaz "Footie", daan "Dahliah" — all 7 resolve in `DEFAULT_PLAYERS`, no overrides needed. **BUT** turn-start check revealed a second, deeper rollback: commits `33bdae1`+`9eb1169` AND the 24 batch-1 JPGs gone again (B9 *code edits* + STATE.md + turn-prior zip survived; uploads always survive). Recovery: re-converted all 31 slides from uploads (70.1MB→7.2MB), verified **31/31**, recommitted everything in ONE turn-atomic commit `297c287`. New rule below in Landmines.
- **2026-07-23 late night (agent)** — **WORKSPACE ROLLBACK INCIDENT + RECOVERY.** Mid-session the workspace snapshot rolled back and silently ate commit `93e1719` (gallery batch 1) plus the 24 generated JPGs on disk — while `js/campaign-loading.js` kept its gallery code (dangling refs). Caught because the zip rebuilt at 226 files/36.1MB instead of 250/41.6MB. Recovery: source PNGs survived in `/home/user/uploads/` → re-ran the PIL conversion (identical 52.2MB→5.5MB) → re-verified 24/24 (files + nicknames + alias) → recommitted as `9eb1169` on top of B9 (`33bdae1`). Lesson: after any interrupted turn, run `git log --oneline -3` + a zip file-count sanity check before shipping.
- **2026-07-23 night (agent)** — **B9 (scrollbars over pack cinematic):** user screenshot showed the page's scrollbars painting over the Champion Box opening. Root: none of the three fullscreen overlays (pack / cutscene / loading) locked document scroll, so the scrollable dashboard behind stayed scrollbar-visible over the fixed overlay. Fix: save/restore `overflow:hidden` lock on `<html>`+`<body>` for each overlay's lifetime (nesting-safe). Node DOM-stub sim **15/15** (lock on open, restore on close ×3 overlays). Also wrote the retrospective **B8 row** (store-art scramble) into the bug table for the paper trail. Zip rebuilt — deploy + hard-refresh.
- **2026-07-23 night (agent)** — **B6 (save-poisoning + cloud stomp):** Otters account still got Bader/Zakhar + phantom "No pack owned". Root: pre-fix code wrote `club:'strigidae'` into old saves; cloud load blindly overwrote local ~1s after entry, stomping the picker choice AND new pack buys. Fix batch: `updatedAt` stamps, fresher-save-wins reconcile, explicit-choice club authority, header club chip with repick, tutorial-before-lore ordering, toast-not-alert pack errors. Files: `js/campaign-store.js`, `campaign.html`. Node sim 4/4. Zip rebuilt — **deploy + hard-refresh; if ever unsure, click the club chip ✎**.

---

## ▶️ Next Actions (priority order)

1. **User: `git push` the `Development` branch**, then hard-refresh `campaign.html`:
   - first load = pick-your-club screen (if save had no club) → full 10s lore loading → guide intro cutscene → tutorial
   - buy/open a pack → single centered cinematic with storekeeper of YOUR club
   - open Shop → your club's storekeeper, portrait, accent and backdrop
   - **NEW: open Chapters → any unlocked chapter → intro cutscene plays (ch5 has choices); rewatch via 📖 REPLAY INTRO**
2. Confirm each bug row + Phase 1 scenes in-browser → I flip **FIXED** → **VERIFIED** and start **Phase 2** (choice flags, affinity, consequence layer, Chapter 5 rebuilt with real Consequence; pre-match rival one-liners via relationship graph).
3. Phase 2 design note to honor: choices stay flavor-with-bonuses, never hard-block content.
4. Optional cleanups (say the word): delete duplicate root JS files; make Chapter 5 actually field the second-in-command; wire more lore into campaign chapters.
