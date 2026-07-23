# Campaign Loading Sequence — Implementation Guide

## What Was Added

### 1. Cinematic Loading Sequence (`js/campaign-loading.js`)
- **Randomized 3-screen loading sequence** before campaign dashboard appears
- Each screen shows: Mentor → Storekeeper → Captain (in random order)
- Club-specific content for Strigidae, Otters, and Shizuka
- Full 10-second sequence on first visit, then 2.5-second quick version
- Automatic portrait loading with fallback handling

### 2. Portrait Mapping
All player portraits are mapped in `PLAYER_PORTRAITS` object:
- Uses existing repo file structure (lowercase filenames)
- Storekeepers use `assets/portraits/` (capitalized: Bader.png, Aiden.png, Zandorah.png)
- Players use `assets/players/` (lowercase: big-b.png, burla.png, stratus.png, etc.)

### 3. Store System Integration
- **The Night's Counter** (Strigidae) — Run by Bader
- **The Otter Box** (Otters) — Run by Aiden  
- **The Shizuka Cafe** (Shizuka) — Run by Zandorah

Each store has:
- Unique personality and dialogue
- Rarity-specific reactions to pack openings
- Storekeeper portrait display

## Images You Need to Add

### Storekeeper Portraits (REQUIRED)
These files should be in `assets/portraits/`:
- ✅ `Bader.png` — Already added
- ✅ `Aiden.png` — Already added
- ✅ `Zandorah.png` — Already added

### Player Portraits (Already in Repo)
All player images already exist in `assets/players/` with lowercase names:
- `big-b.png`, `burla.png` (Nathan), `stratus.png` (Zai)
- `ibrahim.png`, `skuppa.png`, `narcis.png`, `mizu.png`, `ihor.png`, `ani.png`, `tabeeb.png`
- `moon.png`, `floor.png`, `renars.png`, `rashid.png`, `linus.png`, `joep.png`, `dawood.png`, `max.png`, `merel.png`, `mandie.png`
- `luna.png`, `zakhar.png`, `gabsche.png` (Gabshi), `robin.png`, `pavel.png`, `bouschra.png`, `aizaz.png`, `daan.png`, `ricardo.png`
- `ayaz.png`, `steven.png`, `pato.png`, `tamara.png`, `nikita-blond.png`, `nikita-brown.png`, `rei.png`, `joran.png`, `islom.png`, `anezka.png`

### Optional: Add "Legendary" Comic Portraits
If you want to replace the existing portraits with the comic-style "Legendary" versions you uploaded:

**Option A: Replace existing files**
- Rename your uploaded files to match the repo structure
- Example: `Big-B Legendary.png` → `big-b.png`
- Upload to `assets/players/`

**Option B: Keep both versions**
- Add Legendary versions with `-legendary` suffix
- Example: `big-b-legendary.png`
- Update `PLAYER_PORTRAITS` in `js/campaign-loading.js` to use the legendary paths

## How the Loading Sequence Works

### Sequence Flow
1. User opens `campaign.html`
2. System checks if full sequence should show (first visit or after 24 hours)
3. **If full sequence:**
   - Shows 3 screens (Mentor, Storekeeper, Captain) in random order
   - Each screen displays for ~3.3 seconds
   - Total duration: 10 seconds
4. **If quick sequence:**
   - Shows 3 screens in random order
   - Each screen displays for ~0.8 seconds
   - Total duration: 2.5 seconds
5. Campaign dashboard appears

### Screen Content
Each screen shows:
- **Portrait** (circular, with glow effect)
- **Role label** (Mentor / Second-in-Command / Captain)
- **Character name**
- **Random quote** from character's quote pool
- **Subtext** (loading message)
- **Progress bar**

### Club-Specific Examples

#### Strigidae
- **Zakhar (Mentor):** "You are not here to be welcomed. You are here to evolve."
- **Bader (Storekeeper):** "A box is potential. What matters is what you do with it."
- **Big-B (Captain):** "I was here long before you were here and will be here long after you are gone."

#### Otters
- **Mandie (Mentor):** "Do not overthink it. Feel the court."
- **Aiden (Storekeeper):** "Could be trash. Could be fire. That is the whole point."
- **Nathan/Burla (Captain):** "The moment you think you understand the play, we change it."

#### Shizuka
- **Bouschra (Mentor):** "In Shizuka, the court talks. Most people do not listen."
- **Zandorah (Storekeeper):** "The Cafe is quiet for a reason. People make worse choices when they are loud."
- **Zai (Captain):** "The court does not lie."

## Technical Details

### File Changes
- `js/campaign-loading.js` — New file with loading sequence logic
- `campaign.html` — Updated `init()` to be async and call loading sequence
- `js/relationships.js` — Already has storekeeper structure
- `js/store-system.js` — Already has store definitions

### Browser Compatibility
- Uses modern JavaScript (async/await, template literals)
- Works on all modern browsers
- Graceful fallback if portrait images fail to load (shows volleyball emoji 🏐)

### Performance
- Portraits load asynchronously
- No blocking of campaign initialization
- Sequence can be skipped by clicking (future enhancement)

## Testing

After deploying, test:
1. Open `campaign.html` — should see loading sequence
2. Check all 3 clubs show correct characters
3. Verify portraits load correctly
4. Refresh page — should see quick version (2.5s)
5. Clear localStorage — should see full version again (10s)

## Future Enhancements

Possible additions:
- Skip button to bypass loading sequence
- Sound effects during transitions
- Animated background per club
- Character-specific animations
- Loading tips about game mechanics
