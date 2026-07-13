// League + Club lore. Single source of truth for the history/story pages.

export const LEAGUE = {
  name: "The Gomi Cup",
  founded: 2026,
  setting: "Indoor",
  tagline: "Three former teammates. One trophy. No mercy.",
  chapters: [
    {
      title: "Chapter I — One Team, One Court",
      body: "Before there was a rivalry, there was rotation. Big-B, Burla, and Stratus wore the same jersey. Same warm-up chants, same post-practice ramen, same bus rides home. They knew each other's cues in the air before the setter's hands even opened. On paper, they were teammates. In truth, they were three different answers to the same question: <em>who is really carrying this team?</em>"
    },
    {
      title: "Chapter II — The Split",
      body: "It wasn't a fight. It was quieter than that. A season ended, medals were handed out, and the question that had been hovering above every practice finally landed on the floor: <em>if we weren't on the same side, who wins?</em> None of them answered out loud. Instead, each of them walked away and started building."
    },
    {
      title: "Chapter III — The Cup",
      body: "In 2026, they came back with logos, jerseys, mottos in kanji, and rosters they weren't allowed to see the names of. Nineteen players in total would earn a spot across the three teams. Fourteen would not. This is <strong>The Gomi Cup</strong> — the tournament three former teammates built to finally answer the question they never dared ask out loud."
    }
  ]
};

export const CLUBS = {
  strigidae: {
    id: "strigidae",
    name: "Strigidae",
    tagline: "The Night Predator",
    mascot: "Owl",
    logoUrl: "./assets/strigidae.png",
    jerseyUrl: "./assets/jerseys/strigidae.png",
    colorPrimary: "#dc2626",
    colorSecondary: "#000000",
    motto: {
      kanji: "忠 · 守護 · 絆",
      english: "Loyalty · Protection · Bond"
    },
    identity: "The owl watches everything from above. It reads the setter before the ball even leaves their hands. It doesn't make a sound; it just strikes when the moment is right. Strigidae represents the intellectual and unbreakable wall of the league — vision, precision, and cold calculation.",
    philosophy: "Read. Wait. Strike. Strigidae doesn't chase the ball; they let the ball come to them. Every block is pre-loaded. Every dig is where it was supposed to be five seconds ago. They don't win in transition — they win in silence.",
    captain: {
      name: "Big-B",
      role: "Middle Blocker",
      title: "The Night Predator",
      bio: "Big-B doesn't celebrate. He watches. Every play, every setter's hand shape, every hitter's approach angle — filed away. By the second set, he's not blocking hitters, he's blocking <em>plans</em>. Where other middles jump on reflex, Big-B has already decided where the ball is going before the setter has touched it."
    }
  },

  otters: {
    id: "otters",
    name: "Kòrsou Otters",
    tagline: "Playful. Fierce. Bonded.",
    mascot: "Otter",
    logoUrl: "./assets/otters.png",
    jerseyUrl: "./assets/jerseys/otters.png",
    colorPrimary: "#16a34a",
    colorSecondary: "#000000",
    motto: {
      kanji: "遊 · 猛 · 絆",
      english: "Play · Fierce · Bond"
    },
    identity: "Otters look cute and playful on the surface, but they are relentless and sharp in the water. Kòrsou Otters is the same way — they smile, they troll, they bait the block — and then they dump the ball right over your head. The unpredictable, energetic heartbeat of the league.",
    philosophy: "Weaponized chaos. If Strigidae is a wall, the Otters are the water finding every crack in it. Fast tempo, unexpected sets, tip when you expect a swing, swing when you expect a tip. You never know what's coming next — and neither do they.",
    captain: {
      name: "Burla",
      role: "Setter",
      title: "The Trickster",
      bio: "Burla runs the offense like a magician runs a room — half the show is misdirection. A grin, a fake, an eye toward the pipe, and then the ball is somehow on the outside for a wide-open swing. Opponents watch her hands. They should be watching her eyes."
    }
  },

  shizuka: {
    id: "shizuka",
    name: "Shizuka",
    tagline: "Calm. Quiet. Mirror.",
    mascot: "Cat (Yin-Yang)",
    logoUrl: "./assets/shizuka.png",
    jerseyUrl: "./assets/jerseys/shizuka.png",
    colorPrimary: "#2563eb",
    colorSecondary: "#78716c",
    motto: {
      kanji: "穏 · 静 · 鏡",
      english: "Calm · Quiet · Mirror"
    },
    identity: "Shizuka (静か) — 'quiet' in Japanese. Based on the Yin-Yang design, the cat represents the duality of a libero: soft hands but a hard stop. While everyone else is panicking, Shizuka is completely still. They don't fight the ball — they just reflect it. The silent, unshakeable foundation of the league.",
    philosophy: "Balance, reflexes, and untouchable calm. Shizuka doesn't try to outscore you — they try to outlast you. Every ball comes back. Every attack gets picked up. When you finally make a mistake — and you will — they're already in position for it.",
    captain: {
      name: "Stratus",
      role: "Libero",
      title: "The Mirror",
      bio: "You wouldn't guess Stratus is the captain. No shouting, no chest-beating, no wild celebrations — just a quiet head-nod after a 15-touch rally that she saved four times. Stratus doesn't lead with volume; she leads by making the impossible dig look like she was bored while doing it."
    }
  }
};

// Mini bios per player, keyed by player id (matches ids in data.js).
export const PLAYER_BIOS = {
  // Captain bios (short scouting-report style, references the nickname)
  'big-b':        "You jump, you get blocked, the lights go out. That's why they call him Blackout — reads the setter before the ball leaves the hand.",
  'burla':        "The Trickster runs the offense like a magic show. Half the play is misdirection — smile, fake, dump. You never see it coming.",
  'stratus':      "The Mirror. Doesn't fight the ball, just reflects it back at you. Never celebrates. Just resets and waits for the next one.",


  'ayaz':         "The most natural athlete on the court who somehow made it here without ever playing volleyball seriously. Reads plays like a defender in another sport — because that's exactly what he is.",
  'steven':       "Doesn't jump the highest, doesn't hit the hardest — somehow still ends every rally on the scoreboard. Small frame, giant timing.",
  'pato':         "Named after the anime libero for a reason. Pancakes balls that should have hit the floor two seconds ago. Lives on the wood.",
  'moon':         "Terminator arm. Every swing is a full commit. When the set is good, it's not even fair — the ball crosses the net before the block gets there.",
  'ibrahim':      "Every gym needs one. Full effort, huge heart, still figuring out where his hands go. Give him a year and this bio gets rewritten.",
  'tamara':       "Named for the future because that's when the block realizes she already dug it. Reads angles like she has the game manual.",
  'ricardo':      "The complete package — hits, serves, digs, sets, moves. There is no weakness to attack. Coaches build offenses around him without needing to ask.",
  'nikita-blond': "Left-side sniper. Rope-line swings that clip the antenna and drop inside the pin. The kind of hitter you set even from a bad pass.",
  'nikita-brown': "The one no captain wants to leave for the next round. Nine out of nine. Every single skill. Every single rally. Just Nightmare.",
  'max':          "Massive right arm, allergic to jumping. Sits down every attack. If you can convince him the floor is lava, he might just be top-three in the league.",
  'luna':         "Officially listed as libero, unofficially plays every position at once. Diving pass, running set, cover on the block. All in one rotation.",
  'floor':        "Steady as her name. Never panics, never over-swings, always in the right spot. The player every captain wishes they had two of.",
  'narcis':       "You'll see the ceiling on his ceiling next season. Right now he's rated for what he does; ask again in six months.",
  'rei':          "The brain of any team he's on. Sets tempos other teams don't have plays for. Won't out-power you — will absolutely out-think you.",
  'zakhar':       "Wing on defense. Somehow always in front of the ball. The kind of pass that turns broken plays into first-tempo kills.",
  'renars':       "Elite. Hates the nickname his teammates gave him. Uses it as fuel. Every serve after being reminded of it lands in the corner.",
  'rashid':       "Solid across every stat — the seven-out-of-ten specialist. No weakness to hunt, no highlight reel to fear. Just wins his rotation.",
  'mizu':         "Quiet swings, quiet digs, quiet leadership. Never the loudest on court, always in the box score.",
  'linus':        "Explosive. Left-handed rockets from the right side. When the ball leaves his hand you don't hear it — you hear it hit the tape.",
  'joran':        "Every gym has a legend. Joran is that legend on this floor. Nines across the board. Not a stat to fix — a stat to fear.",
  'skuppa':       "New to the sport, bringing pure vibes. Great teammate. Will run through a wall for a pass. The wall might win — for now.",
  'islom':        "Point-blank rocket-propelled grenades. Fires from the pin, fires from the pipe, fires from where you didn't think you needed a blocker. Rockets everywhere.",
  'ihor':         "Head high, chin up, brain always three moves ahead. Every touch has a purpose. Every purpose has a plan.",
  'bouschra':     "Long strides. Reads the block before jumping. Turns half-decent sets into clean kills through sheer body control.",
  'anezka':       "First season energy. Every ball she touches surprises her — and everyone else. Bright future, current chapter still being written.",
  'joep':         "Hands like glass. Sets that arrive exactly where a hitter's swing was already going. Rarely spectacular, always exactly right.",
  'pavel':        "Attack side, defense side, doesn't matter. Cleans up whatever the rally leaves behind. Nothing hits the floor near him without a fight.",
  'merel':        "Feet don't leave the ground; her mind never leaves the play. Always in the right spot, always making the correct next touch.",
  'tabeeb':       "Big personality on a raw skill set. When it clicks, it clicks — the highlight is coming. Just needs the reps.",

  // Second-wave additions
  'daan':         "Blooms under pressure. Named for a flower, plays like a weed — impossible to root out of any rotation.",
  'gabsche':      "Wears the C on any team he joins. Reads the whole floor before the serve is even up. Elite in every column.",
  'ani':          "Everyone else is a guest — Ani is running the party. Average stats, above-average vibes, keeps rallies alive.",
  'mandie':       "Sniper's calm. Doesn't force shots — waits until the block splits, then puts it exactly where it needs to go.",
  'dawood':       "Setter one moment, opposite the next. Loads the hands, then loads the arm. You never know where the ball is going, and neither does the block.",
  'aizaz':        "Every gym needs the spark plug. Not the loudest stat line, but the guy whose hustle keeps the whole side moving.",
  'robin':        "7 across the board. No highlight reel, no weakness to hunt — just wins his rotation every single time."
};

// Positions per team come from the roster after draft; we don't need to hard-code them here.
