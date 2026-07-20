# Player Identity, Progression & Approval Release

## Player profiles
Existing profile pages now add:
- a **This is your player card** badge when a signed-in linked account views its player;
- potential synergy/team-up list;
- saved simulator match history;
- private correction request form for the linked player.

## Match records
`js/progression.js` stores each completed 2D/3D simulator match under `matchResults/` and updates persistent chemistry for each roster. Player profiles read this history.

## Card reveal
Full reveal still waits for all photo checks; finished cards now animate in as one completed reveal instead of appearing as a mixed unfinished grid.

## Approval/admin
Commissioners now see profile correction requests in Admin and can mark requests resolved. Existing membership approval and player-link controls remain in the Membership Requests section.

## Firebase rules
Before public release, add Firebase rules for `matchResults` and `profileCorrections`. Client-side controls alone are not sufficient security.
