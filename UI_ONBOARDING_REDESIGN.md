# UI + onboarding redesign

## Flow
1. Retro start screen → login/request access.
2. New accounts receive the four illustrated tutorial slides.
3. New accounts then make a deliberate, interactive club choice.
4. Pending members receive the tutorial every time they log in until `status: "approved"`.
5. Approved members go directly to their dashboard; **How to Play** remains replayable.

## Dashboard information architecture
- **Play:** Dream Team, 2D Sim, 3D Sim, Draft
- **Players:** Cards, Player Stats
- **Team Lab:** Chemistry, Synergies
- **League:** Standings, Club Hub, League History
- **Extras:** Photos, tutorial, commissioner controls

## Full-reveal cards
The Full Reveal mode now waits for all player photo checks to settle before it paints any card. This prevents a partial page where generic/mystery placeholders are visible beside already completed images.
