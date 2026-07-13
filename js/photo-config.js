// Per-player circular avatar tweaks.
//
// offsetY: 0 = top of image, 50 = middle, 100 = bottom
//          higher number = shift crop DOWN (reveals more of the LOWER part)
// zoom:    1.0 = fit as-is, 1.5 = zoom in 50%, 2.0 = zoom in 100%
//          higher = person fills more of the circle (crops out transparent edges)

export const PHOTO_CONFIG = {
  // Captains
  'big-b':        { y: 20, zoom: 1.0 },
  'burla':        { y: 18, zoom: 1.0 },
  'stratus':      { y: 15, zoom: 1.0 },

  // Draft pool — tuned based on user feedback
  'ayaz':         { y: 18, zoom: 1.0 },
  'steven':       { y: 22, zoom: 1.0 },   // was 20, tiny nudge down
  'pato':         { y: 22, zoom: 1.1 },   // small in frame, zoom in a bit
  'moon':         { y: 12, zoom: 1.1 },
  'ibrahim':      { y: 22, zoom: 1.2 },   // zoom in, face too small
  'tamara':       { y: 22, zoom: 1.3 },   // sideways photo, zoom to fill
  'ricardo':      { y: 20, zoom: 1.0 },
  'nikita-blond': { y: 20, zoom: 1.2 },   // zoom in
  'nikita-brown': { y: 25, zoom: 1.3 },   // sideways head, zoom + shift
  'max':          { y: 15, zoom: 1.0 },
  'luna':         { y: 20, zoom: 1.0 },
  'floor':        { y: 20, zoom: 1.0 },   // nudge down a smidge
  'narcis':       { y: 15, zoom: 1.0 },   // nudge down a smidge
  'rei':          { y: 25, zoom: 1.4 },   // sideways pose, zoom in hard
  'zakhar':       { y: 15, zoom: 1.0 },
  'renars':       { y: 20, zoom: 1.0 },
  'rashid':       { y: 15, zoom: 1.0 },
  'mizu':         { y: 20, zoom: 1.0 },
  'linus':        { y: 12, zoom: 1.0 },
  'joran':        { y: 18, zoom: 1.0 },
  'skuppa':       { y: 25, zoom: 1.2 },   // wearing durag, zoom to fill
  'islom':        { y: 15, zoom: 1.0 },
  'ihor':         { y: 18, zoom: 1.0 },
  'bouschra':     { y: 22, zoom: 1.2 },   // zoom in
  'anezka':       { y: 22, zoom: 1.3 },   // zoom in
  'joep':         { y: 18, zoom: 1.0 },
  'pavel':        { y: 20, zoom: 1.0 },
  'merel':        { y: 15, zoom: 1.0 },   // nudge down a smidge
  'tabeeb':       { y: 20, zoom: 1.0 }
};

/** Get the offset Y for a player id (fallback: 15) */
export function photoOffsetY(id) {
  const c = PHOTO_CONFIG[id];
  return c && typeof c.y === 'number' ? c.y : 15;
}

/** Get the zoom multiplier for a player id (fallback: 1.0) */
export function photoZoom(id) {
  const c = PHOTO_CONFIG[id];
  return c && typeof c.zoom === 'number' ? c.zoom : 1.0;
}
