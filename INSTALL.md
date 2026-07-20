# Gomi Cup — Campaign Mode Patch (v2)

Adds full offline Campaign Mode with:

- **9 chapters × 10 sequential matches × 3 difficulties** (270 total matches)
- **Real first-to-5 court battles** on a dedicated 2D court using the existing v3 engine
- **Pack opening, rarities, duplicates → stars, training, leveling**
- **Guided quick-start tutorial** that forces the player to open a pack and try the shop
- **Every pack lists the exact chance of pulling a player at each rarity**
- **Roster moves refresh instantly** (no page reload needed to see a card leave Unassigned)
- **Campaign link on the main dashboard's Play tab**

## Files in this patch

```
INSTALL.md                                     ← this file
index.html                                     ← updated to add Campaign to the Play tab
campaign.html                                  ← campaign hub (dashboard, roster, chapters, packs, collection, shop, guide)
campaign-match.html                            ← dedicated first-to-5 2D campaign court
js/campaign-store.js                           ← state, packs, chapter rivals, matches, saves
js/campaign-art.js                             ← artwork resolver
assets/campaign/cards/<pid>/legendary.png      ← 13 legendary alt-art portraits
```

## Install steps (GitHub web upload)

1. **Drag `campaign.html` and `campaign-match.html`** into the repo root of the `Development` branch.
2. **Drag `js/campaign-store.js` and `js/campaign-art.js`** into the `js/` folder.
3. **Upload the `assets/campaign/` folder** into `assets/` (13 legendary portraits).
4. **Replace `index.html` at the repo root** with the one in this ZIP (only change: adds the Campaign card to the Play tab).
5. Commit + push, wait for Pages to build, then hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## What you get after step 5

- Dashboard's **🎮 Play** tab now shows **🏐 Campaign** at the top.
- First visit to `campaign.html` triggers the 7-step **Gomi Coach** quick-start guide:
  1. Welcome + full game loop
  2. Rarity legend with multipliers
  3. Three upgrade paths (levels, duplicate stars, training)
  4. **Forces opening the Starter Pack** to meet a new card
  5. Explains Unassigned → Bench, offers 1-click move
  6. Explains the shop and lets you optionally buy another pack
  7. Sends you to Chapter 1 · Match 1
- Every match runs a real 2D volleyball simulation, first-to-5, no win-by-two.

## Progression rules

- Matches unlock **sequentially** inside a chapter: win Match 1 → unlock Match 2 → … → Match 10.
- Rivals: 4 solo teams first (Matches 1–7), 2 alliances (8 & 9), all four together (10).
- **Easy** chapters unlock sequentially after all 10 matches are won.
- **Medium** unlocks only after **all 90 Easy matches** are cleared.
- **Hard** unlocks only after all 90 Medium matches are cleared.

## Rarity system

| Rarity | Colour | Stat multiplier | Art |
|---|---|---|---|
| Common | Grey `#94a3b8` | × 1.00 | Original photo |
| Uncommon | Green `#22c55e` | × 1.08 | Original photo |
| Rare | Blue `#3b82f6` | × 1.18 | Original photo |
| Epic | Purple `#a855f7` | × 1.30 | Alt art if available |
| Legendary | Orange `#f97316` | × 1.45 | Alt art if available |

Duplicates give +1 star (up to 5, +0.15 per star to every stat) plus coins. Training uses ATK/DEF/SRV/SET/ATH materials for +0.20 per material to that stat. Levels come from starter XP after wins, +0.05 per level.

## Reset

Inside the campaign, the red **↺ Reset** button in the top-right wipes your save.
