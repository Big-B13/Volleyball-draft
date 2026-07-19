# 🏐 The Gomi Cup — Volleyball Draft & Match Sim

## Membership onboarding (new)

New visitors can create a **pending member account** without an invite code. They immediately receive a club introduction, choose Strigidae, Kòrsou Otters, or Shizuka for their profile, and can explore league content plus use both match simulators while they wait.

A commissioner reviews requests in **Admin → Membership Requests**. The private request note helps identify actual players. On approval, the commissioner may optionally link the account to a real player card. Pending or declined accounts cannot enter a non-spectator draft, captain slot, or commissioner tools.

> **Security:** the interface blocks restricted features, but public deployments also need Firebase Realtime Database Rules. Read `FIREBASE_RULES_MEMBERSHIP.md` before sharing the site publicly.

## Existing game features

# 🏐 The Blind Draft — Volleyball Online Edition

A real-time multiplayer volleyball draft app for 3 captains competing over a shared pool of players. Built for the Strigidae 🦉 / Kòrsou Otters 🦦 / Shizuka ☁️ league.

Captains join from their own devices, take turns picking blind (nickname + stats only, no real names), see everyone else's picks live, and get a dramatic big reveal at the end.

## Features

- **Real-time sync** via Firebase — 3 captains on 3 devices, no refresh needed
- **Blind draft**: only nicknames + stats visible; real names hidden until reveal
- **Snake draft**: A→B→C→C→B→A→A→B→C… over 5 rounds
- **Turn enforcement**: only the on-clock captain can pick
- **Full visibility**: everyone sees all picks made by everyone in real time
- **Cutthroat mode**: 29 players fight for 15 spots — 14 players don't make any team
- **Big reveal**: real names + nicknames + team logos at the end
- **Commissioner mode**: one person sets up + starts the draft
- **Captain codes**: each captain gets a secret code so nobody can pick as someone else

## Quick start

### 1. Fork/clone this repo
```bash
git clone https://github.com/YOUR-USERNAME/volleyball-draft-online.git
cd volleyball-draft-online
```

### 2. Create a free Firebase project (5 min)

1. Go to https://console.firebase.google.com/ and click **Add project**
2. Name it (e.g. `volleyball-draft`), disable Google Analytics for simplicity
3. In the sidebar → **Build → Realtime Database** → Create database → **Start in test mode** → pick your region (europe-west1 for the Netherlands)
4. In the sidebar → **Project settings (⚙️) → General → Your apps** → click the **`</>`** (Web) icon
5. Register the app (any nickname), copy the `firebaseConfig` object it shows you

### 3. Paste your Firebase config
Open `js/firebase-config.js` and replace the placeholder with your real config:
```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "your-project",
  ...
};
```

### 4. Deploy to GitHub Pages

1. In your repo → **Settings → Pages**
2. Source: **Deploy from a branch** → `main` / `/root` → Save
3. Wait ~1 minute, your site is live at `https://YOUR-USERNAME.github.io/volleyball-draft-online/`

### 5. Run the draft

**Commissioner (you):**
1. Open the site, go to **Commissioner Setup**
2. Confirm/edit captains + 29 players + ratings
3. Click **Create Draft Room** — get a room ID + 3 captain codes
4. Send each captain their code

**Captains:**
1. Open the site, click **Join as Captain**
2. Enter room ID + captain code
3. Wait for your turn, pick your player when it's your turn, watch others pick

**Big reveal:**
Automatic once the 15th pick is made. Film your friends' faces 🎬

## Security notes

The default Firebase "test mode" rules let anyone read/write for 30 days. For a private draft that's fine. Once the draft is done, delete the database or lock it down.

If you want to keep it locked to just your league, replace the rules in **Firebase Console → Realtime Database → Rules** with:
```json
{
  "rules": {
    "drafts": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## Project structure

```
volleyball-draft-online/
├── index.html              # Landing page (join / commissioner)
├── setup.html              # Commissioner setup screen
├── draft.html              # Live draft screen (captains + spectators)
├── reveal.html             # Big reveal screen (with team lore + player bios)
├── league.html             # The Gomi Cup founding story
├── clubs.html              # Overview of all 3 clubs
├── clubs/
│   ├── strigidae.html      # Strigidae 🦉 full page
│   ├── otters.html         # Kòrsou Otters 🦦 full page
│   ├── shizuka.html        # Shizuka ☁️ full page
│   └── _template.html      # Shared template (source of the club pages)
├── css/style.css           # Shared styles
├── js/
│   ├── firebase-config.js  # YOUR Firebase config (edit this!)
│   ├── firebase-init.js    # Firebase SDK loader
│   ├── data.js             # 29 default players + captain defaults
│   ├── lore.js             # League + club history + player bios
│   ├── setup.js            # Commissioner setup logic
│   ├── draft.js            # Live draft logic (real-time)
│   ├── reveal.js           # Reveal screen logic
│   └── util.js             # Shared helpers (snake draft order, etc.)
└── assets/
    ├── strigidae.png       # Club logos
    ├── otters.png
    ├── shizuka.png
    └── jerseys/
        ├── strigidae.png   # Jersey mockups
        ├── otters.png
        └── shizuka.png
```

## License

MIT — do whatever you want with this. Have fun with the draft 🏐
