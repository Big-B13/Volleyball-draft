# Gomi Cup — Campaign Mode Patch

Adds a full offline campaign mode with 9 chapters × 3 difficulties, pack opening, rarities, and player upgrades.

## Files in this patch

```
campaign.html                                  ← the campaign page (root of repo)
js/campaign-store.js                           ← state, packs, chapters, saves
js/campaign-art.js                             ← artwork resolver
assets/campaign/cards/big-b/legendary.png      ← 13 legendary alt-art portraits
assets/campaign/cards/burla/legendary.png
assets/campaign/cards/stratus/legendary.png
assets/campaign/cards/ricardo/legendary.png
assets/campaign/cards/steven/legendary.png
assets/campaign/cards/joran/legendary.png
assets/campaign/cards/nikita-brown/legendary.png
assets/campaign/cards/bouschra/legendary.png
assets/campaign/cards/islom/legendary.png
assets/campaign/cards/nikita-blond/legendary.png
assets/campaign/cards/linus/legendary.png
assets/campaign/cards/gabsche/legendary.png
assets/campaign/cards/zakhar/legendary.png
```

## Install steps (GitHub web upload)

1. **Add the 3 new files** to your `Development` branch:
   - Drag `campaign.html` into the repo root
   - Drag `js/campaign-store.js` and `js/campaign-art.js` into the `js/` folder
2. **Add the artwork folder** — upload the entire `assets/campaign/` folder to `assets/`
3. **Add a link to the dashboard** — edit `index.html` and add somewhere:
   ```html
   <a href="./campaign.html">🏐 Campaign Mode</a>
   ```
4. **Deploy** — commit + push → wait for Pages build → hard-refresh (Ctrl+Shift+R)

## How it works

- Opens at `/campaign.html`
- Uses `localStorage` only — no Firebase needed
- Imports `DEFAULT_PLAYERS` from your existing `js/data.js`

## Test it

1. Open `campaign.html` in a browser (via GitHub Pages or locally)
2. Click **START CAMPAIGN**
3. You get:
   - The Underdog Six (6 lowest-rated players as Common cards)
   - 1 Starter Pack
   - 100 coins
4. Open the pack → get a new player
5. Click **CHAPTERS** → Challenge Chapter 1 Easy
6. Win to unlock Chapter 2, earn coins, pack, and materials

## Progression rules

- **Easy** chapters unlock sequentially: clear Ch 1 → unlock Ch 2 → ... → Ch 9
- **Medium** unlocks only after ALL 9 Easy chapters cleared
- **Hard** unlocks only after ALL 9 Medium chapters cleared

## Rarity system

- **Common** (grey) — base stats × 1.00
- **Uncommon** (green) — × 1.08
- **Rare** (blue) — × 1.18
- **Epic** (purple) — × 1.30, uses alt art if available
- **Legendary** (orange) — × 1.45, always uses alt art

Duplicates convert to +1 star (max 5), each star adds +0.15 to every stat.

## Reset

Inside the campaign, use the red **↺ Reset** button in the top-right to wipe your save.
