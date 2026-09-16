/**
 * Generates src/shell/crt-frame.png: the soft dark frame that gives the picture its
 * rounded CRT corners, replacing the old clip-path.
 *
 * A clip cuts a hard edge. A tube fades into its mask over a dozen pixels, and that
 * feather is most of what sells it, so the corners are an image rather than a clip.
 *
 * The boundary is a rounded rectangle whose edges bow outward: the picture is widest
 * across the middle of each edge and pulls in toward the corners. Both parts matter - a
 * superellipse rounds far too much at this corner size, and a plain rounded rect with
 * straight edges reads as a card rather than a screen.
 *
 * The frame is painted in the page colour and stretched over the whole viewport at
 * runtime, so the corners scale with the window.
 */
const fs = require('fs');
const { blank, encode } = require('./imglib');

const W = 1024;
const H = 768;

const RADIUS = Number(process.argv[2] ?? 56);
const INSET = 1;        // picture stops this far short of the edge at its widest
const FEATHER = 13;     // width of the fade from clear to solid
const BOW = 0.016;      // barrel bulge, as a fraction of each half-extent

// Page colour (#1a1a1a), so the frame melts into the background around the picture.
const R = 0x1a, G = 0x1a, B = 0x1a;

const smoothstep = (t) => t * t * (3 - 2 * t);

// Signed distance to a rounded rectangle: negative inside, positive outside.
function sdRoundRect(px, py, hw, hh, r) {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const img = blank(W, H);
const hw = W / 2 - INSET;
const hh = H / 2 - INSET;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = x - W / 2 + 0.5;
    const py = y - H / 2 + 0.5;
    // Each half-extent pulls in with the square of how far along the other axis we are,
    // which is what bows the edges out at their midpoints.
    const u = Math.min(1, Math.abs(px) / hw);
    const v = Math.min(1, Math.abs(py) / hh);
    const d = sdRoundRect(px, py, hw * (1 - BOW * v * v), hh * (1 - BOW * u * u), RADIUS);
    const t = Math.max(0, Math.min(1, (d + FEATHER) / FEATHER));
    const i = (y * W + x) * 4;
    img.data[i] = R;
    img.data[i + 1] = G;
    img.data[i + 2] = B;
    img.data[i + 3] = Math.round(smoothstep(t) * 255);
  }
}

encode('src/shell/crt-frame.png', img);
console.log(`crt-frame.png  ${W}x${H}  radius ${RADIUS}  inset ${INSET}  feather ${FEATHER}  ` +
  `${(fs.statSync('src/shell/crt-frame.png').size / 1024).toFixed(1)}KB`);
