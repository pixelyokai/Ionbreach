// Minimal PNG (8-bit RGB/RGBA/palette) decoder + encoder, no deps.
const zlib = require('zlib');
const fs = require('fs');

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decode(file) {
  const buf = fs.readFileSync(file);
  let off = 8, idat = [], ihdr = null, plte = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (ihdr.depth !== 8 || ihdr.interlace !== 0) throw new Error('unsupported png: depth ' + ihdr.depth + ' interlace ' + ihdr.interlace);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.color];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, stride = w * channels;
  const lines = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const cur = lines.subarray(y * stride, (y + 1) * stride);
    raw.copy(cur, 0, p, p + stride); p += stride;
    const prev = y ? lines.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0, b = prev ? prev[x] : 0, c = prev && x >= channels ? prev[x - channels] : 0;
      if (filter === 1) cur[x] = (cur[x] + a) & 255;
      else if (filter === 2) cur[x] = (cur[x] + b) & 255;
      else if (filter === 3) cur[x] = (cur[x] + ((a + b) >> 1)) & 255;
      else if (filter === 4) cur[x] = (cur[x] + paeth(a, b, c)) & 255;
    }
  }
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * channels, d = i * 4;
    if (ihdr.color === 6) { px[d] = lines[s]; px[d + 1] = lines[s + 1]; px[d + 2] = lines[s + 2]; px[d + 3] = lines[s + 3]; }
    else if (ihdr.color === 2) { px[d] = lines[s]; px[d + 1] = lines[s + 1]; px[d + 2] = lines[s + 2]; px[d + 3] = 255; }
    else if (ihdr.color === 0) { px[d] = px[d + 1] = px[d + 2] = lines[s]; px[d + 3] = 255; }
    else if (ihdr.color === 4) { px[d] = px[d + 1] = px[d + 2] = lines[s]; px[d + 3] = lines[s + 1]; }
    else { const idx = lines[s]; px[d] = plte[idx * 3]; px[d + 1] = plte[idx * 3 + 1]; px[d + 2] = plte[idx * 3 + 2]; px[d + 3] = trns && idx < trns.length ? trns[idx] : 255; }
  }
  return { width: w, height: h, data: px };
}

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 255];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encode(file, img) {
  const { width: w, height: h, data } = img;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

const blank = (w, h) => ({ width: w, height: h, data: Buffer.alloc(w * h * 4) });

module.exports = { decode, encode, blank };
