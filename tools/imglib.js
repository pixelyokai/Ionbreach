// Small image ops used by the asset build. All nearest-neighbour, pixel-art safe.
const { decode, encode, blank } = require('./png');

const px = (img, x, y) => (y * img.width + x) * 4;

function get(img, x, y) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return [0, 0, 0, 0];
  const i = px(img, x, y);
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

function set(img, x, y, c) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = px(img, x, y);
  img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = c[3];
}

function crop(img, sx, sy, w, h) {
  const out = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(out, x, y, get(img, sx + x, sy + y));
  return out;
}

function rotCW(img) {
  const out = blank(img.height, img.width);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) set(out, x, y, get(img, y, img.height - 1 - x));
  return out;
}

function rotCCW(img) {
  const out = blank(img.height, img.width);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) set(out, x, y, get(img, img.width - 1 - y, x));
  return out;
}

function flipY(img) {
  const out = blank(img.width, img.height);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) set(out, x, y, get(img, x, img.height - 1 - y));
  return out;
}

function scale(img, n) {
  const out = blank(img.width * n, img.height * n);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) set(out, x, y, get(img, (x / n) | 0, (y / n) | 0));
  return out;
}

// Draw src onto dst at (dx, dy), skipping fully transparent source pixels.
function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const c = get(src, x, y);
    if (c[3] === 0) continue;
    set(dst, dx + x, dy + y, c);
  }
}

function mapPixels(img, fn) {
  const out = blank(img.width, img.height);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const c = get(img, x, y);
    set(out, x, y, c[3] === 0 ? c : fn(c, x, y));
  }
  return out;
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = (t) => {
    t = (t % 1 + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => Math.max(0, Math.min(255, Math.round(v * 255))));
}

// Palette swap that keeps the pack's shading: hue is replaced, luminance preserved.
// Dark outline pixels are left alone so silhouettes stay readable.
function recolour(img, { hue, sat = 1, light = 0, keepDark = 0.18 }) {
  return mapPixels(img, (c) => {
    const [h, s, l] = rgbToHsl(c);
    if (l < keepDark) return c;
    const nl = Math.max(0, Math.min(1, l + light));
    const ns = Math.max(0, Math.min(1, s * sat));
    const rgb = hslToRgb([hue === undefined ? h : hue, ns, nl]);
    return [rgb[0], rgb[1], rgb[2], c[3]];
  });
}

// Slice a sheet into frames given a frame size, row-major.
function slice(img, fw, fh) {
  const cols = img.width / fw, rows = img.height / fh, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(crop(img, c * fw, r * fh, fw, fh));
  return out;
}

// Pack equally sized frames into a grid sheet.
function pack(frames, cols) {
  const fw = frames[0].width, fh = frames[0].height, rows = Math.ceil(frames.length / cols);
  const out = blank(fw * cols, fh * rows);
  frames.forEach((f, i) => blit(out, f, (i % cols) * fw, ((i / cols) | 0) * fh));
  return out;
}

module.exports = { decode, encode, blank, get, set, crop, rotCW, rotCCW, flipY, scale, blit, mapPixels, recolour, slice, pack, rgbToHsl, hslToRgb };
