# How Stats Currently Work in the Match Engine (v2 — post-momentum update)

Every player has 5 stats on a 0-10 scale + physical + personality traits.

## STAT USAGE — WHAT EACH STAT DOES NOW

### ATTACK
- Hitter selection weight: `attack²`
- Kill probability: `attackerEffective = attack × setQuality` (main driver)
- **NEW**: Attackers with attack ≥7 can "wipe off" the block for a recovery
  (attack 9 = 25% chance to save a block into continued play)
- Setter dump/quick/slide/back-row skill gates
- Serve stat modifies aggression bonuses on serves

### SERVE
- Ace probability: `statCheck(serve, receiverSkill, ...)`
- **NEW**: `receiverSkill = 70% defense + 30% setting` (touch matters for passing)
- **NEW**: Serve skill drives pass-miss chance too — powerful servers force errors

### DEFENSE
- Receiver weight in serve reception
- Dig score: `defense + athletic×0.5 + hustle + confidence + priority`
- **UPDATED**: Block skill = `60% defense + 40% athletic` (was 100% defense)
- Pass quality bonus for above-avg passers

### SETTING
- Set quality: `setter.setting/10 × 0.5 + incomingQuality × 0.5`
- **NEW**: Setting counts for 30% of pass skill (touch/ball control)
- Gates: dump (≥5.5), tip (≥4), fake (≥6.5)

### ATHLETIC
- Dig support: `defense + athletic × 0.5`
- **NEW**: Blocking — counts for 40% of blocker skill
- Gates for quick (≥6), slide (≥7), back-row attack (≥6.5)
- Visual jump height

### HEIGHT / REACH
- Blocker wall reach bonus: +1 per 15cm above net+15cm
- Attacker reach edge: reduces block chance for tall spikers
- Net-clear gate: reach ≥ 205cm (2m net + 5cm) for over-the-net moves

---

## NEW SYSTEMS

### 🔥 MOMENTUM (team-wide)
Tracks consecutive points won by each team.
- **3 in a row**: +0.2 to all stats for that team
- **4 in a row**: +0.5
- **5+ in a row**: +0.8
- Resets to 0 the moment the team loses a point

**Visual**: Fire aura pulses around every player on that team.
- 3-streak → subtle orange glow
- 4-streak → brighter orange with wider pulse
- 5+-streak → intense red-orange, faster flicker, screen-worthy

**Log**: point line reads "🔥 hot streak" / "🔥🔥 STREAK!" / "🔥🔥🔥 ON FIRE!"

### 🥶 COLD STREAK (per-player)
Tracks each player's personal errors.
- **2 fails in a row** (missed serves, bad passes, attack errors, stuffed spikes): -0.5 penalty on ALL their stats
- **4 fails in a row**: -1.0 penalty (brutal)
- Reset after **2 successful plays** in a row (dig, kill, ace, good pass)

**Visual**: Player circle becomes desaturated + slightly darker + faint blue glow.

### MISSED PASSES (new event)
Not every reception succeeds anymore.
- Miss chance = `0.08 + skillGap × 0.20 - hustle × 0.05` (clamped 2-35%)
- **60% of misses** → ball dies immediately (direct point for server)
- **40% of misses** → scrappy setter still gets to it, but the set is terrible (quality 0.25)
- Event type: `pass-error` with "MISS!" burst

---

## PERSONALITY TRAITS (unchanged)
- **aggression** — tip vs spike, ace-attempt vs safe-serve
- **showboat** — dump/fake frequency
- **discipline** — helper blockers commit
- **hustle** — +1.2 to dig score, +5% to pass success
- **confidence** — clutch factor (score ≥20)
- **chemistry** — setter → hitter selection weighting

---

## EFFECTIVE STAT FORMULA

Everywhere the engine uses a stat now, it uses `effectiveStat(slot, statName, match, side)`:

```
effectiveStat = raw_stat + team_momentum_boost - personal_cold_penalty
              (clamped 1-10)
```

Example: A player with attack=7 on a team with 4-in-a-row momentum but on a personal 2-fail streak:
- effective attack = 7 + 0.5 - 0.5 = 7.0 (momentum cancels their cold)

A player with defense=6 on a team on fire (5+ streak) with no personal slump:
- effective defense = 6 + 0.8 - 0 = 6.8

---

## STAT WEIGHT SUMMARY (updated influence)

| Stat | Impact |
|---|---|
| attack | ★★★★★ (kills, wipe-offs) |
| defense | ★★★★☆ (pass + dig + block) |
| athletic | ★★★★☆ (upgraded from ★★★ — now factors into blocks) |
| setting | ★★★☆☆ (set + pass + touch gates) |
| serve | ★★★☆☆ (upgraded from ★★ — now drives pass misses) |
| height | ★★★☆☆ |
| aggression | ★★☆☆☆ |
| showboat | ★★☆☆☆ |
| hustle | ★★★☆☆ |
| discipline | ★☆☆☆☆ |
| confidence | ★★☆☆☆ |
| chemistry | ★★☆☆☆ (reduced from ★★★ — was too dominant) |
| **momentum** | ★★★★☆ (NEW — can flip a set) |
| **cold streak** | ★★★☆☆ (NEW — a stuck player hurts their team) |
