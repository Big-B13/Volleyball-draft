# Tactical substitutions — first implementation

## 3D simulator
Each team roster now acts as a tactical substitution panel:
1. Between rallies, click one on-court player.
2. Click one bench player.
3. Press **Confirm substitution**.

The system preserves the player’s current court rotation spot, swaps the outgoing player to the bench, reloads the 3D rigs, writes a manual substitution to the play-by-play and flashes the changed rows. Stamina is shown beside every player.

## 2D simulator
2D now builds the same 6-starter + 4-bench v3 roster model as 3D. V3 automatic stamina substitutions are rendered by rebuilding the court when a substitution event occurs. Manual 2D selector UI is the next polish addition, after the 3D control has been tested.
