# Deployment Checklist — The Gomi Cup

Static site on GitHub Pages (branch `Development`). No build step.
**Every 404 in a static ES-module import blanks the whole page** — the browser
resolves the full import graph before running anything. So the checklist below
exists: 60 seconds of it beats debugging a black screen.

## When you add/change files

Upload **all** of them, keeping folder structure. Watch subfolders —
GitHub's web uploader silently drops nested folders sometimes.

- Branch: `Development`
- After commit, Pages rebuild takes ~1 min

## Critical module files (page dies without these)

| Page | Required modules |
|---|---|
| `campaign.html` | `js/campaign-store.js`, `js/campaign-art.js`, `js/pack-opening-system.js`, `js/store-system.js`, `js/oc-system.js`, `js/ui-helpers.js`, `js/campaign-loading.js`, `js/relationships.js` |
| story add-on (never fatal) | `js/cutscene-player.js`, `js/story/index.js`, `js/story/chapter-01..09.js` |

## 60-second post-deploy verification

1. Open these URLs directly — each must show **JavaScript code, not 404**:
   - `https://<your-site>/js/cutscene-player.js`
   - `https://<your-site>/js/story/index.js`
   - (any other file you touched, same idea)
2. Hard-refresh `campaign.html` (**Ctrl+Shift+R** / **Cmd+Shift+R**).
3. Console should be clean of red 404s (favicon warnings are now silenced).

## Design rule going forward

Core systems = static imports. Add-ons (story, future extras) = lazy
`import()` with a fallback, so an add-on can be missing/broken and the game
still runs. If you add a new feature, follow the pattern in `campaign.html`
(search "lazy-loaded add-on").

## If the page is ever blank anyway

1. Console (F12) → the first red 404 names the missing file.
2. Upload that file in the exact same path (names + folders are case-sensitive).
3. Hard-refresh. If it persists: Pages is still rebuilding — wait a minute.
