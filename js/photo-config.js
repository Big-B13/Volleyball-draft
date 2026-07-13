// Per-player CSS object-position Y-offset for circular avatars.
// 0   = show top of image (hair/head at top of circle)
// 50  = show middle of image
// 100 = show bottom of image (chest/waist visible)
//
// Adjust these values to perfectly frame each player's face.
// Higher number = shift crop DOWN (reveals more of the LOWER part of the photo).
// Lower number  = shift crop UP (reveals more of the TOP of the photo).

export const PHOTO_OFFSET_Y = {
  // Captains
  'big-b':        20,
  'burla':        18,
  'stratus':      15,

  // Draft pool — user-requested tweaks
  'ayaz':         18,
  'steven':       28,   // was too high — pulled down toward middle
  'pato':          8,   // was cropping face — shift up to reveal more head
  'moon':         10,   // small in frame — pull toward top-middle
  'ibrahim':      15,
  'tamara':       35,   // face too low — shift down to bring face up
  'ricardo':      18,
  'nikita-blond': 22,
  'nikita-brown': 45,   // was showing only hair — big shift down to reveal face
  'max':          15,
  'luna':         20,
  'floor':        25,   // shift toward middle center
  'narcis':       18,
  'rei':          35,   // shift down to bring face into view
  'zakhar':       12,
  'renars':       30,   // shift down to bring face into view
  'rashid':       15,
  'mizu':         20,
  'linus':        12,
  'joran':        18,
  'skuppa':       20,
  'islom':        15,
  'ihor':         18,
  'bouschra':     15,
  'anezka':       35,   // shift down to bring face into view
  'joep':         18,
  'pavel':        20,
  'merel':        18,
  'tabeeb':       20
};

/** Get the object-position Y value for a player id (fallback: 15%) */
export function photoOffsetY(id) {
  const v = PHOTO_OFFSET_Y[id];
  return typeof v === 'number' ? v : 15;
}
