/**
 * Spritesheet loading and frame slicing. Every sheet is a uniform grid, so a frame index
 * is all a draw call needs.
 */
export function createSpriteStore() {
  const sheets = new Map();
  const images = new Set();

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load ${src}`));
      img.src = src;
    });
  }

  /**
   * A frame size that disagrees with the image fails quietly and strangely - a background
   * tiled on the wrong pitch leaves a gap, a sheet slices mid-sprite - so it is caught at
   * load rather than read off a screenshot later.
   */
  function assertGrid(name, img, def) {
    const cols = img.width / def.fw;
    const rows = img.height / def.fh;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols !== def.cols) {
      throw new Error(
        `sheet "${name}": image is ${img.width}x${img.height}, not ${def.cols} x n frames of ${def.fw}x${def.fh}`,
      );
    }
  }

  return {
    sheets,

    /** @param {Record<string, {src: string, fw: number, fh: number, cols: number}>} defs */
    async load(defs) {
      const entries = Object.entries(defs);
      const loaded = await Promise.all(entries.map(([, d]) => loadImage(d.src)));
      entries.forEach(([name, def], i) => {
        assertGrid(name, loaded[i], def);
        images.add(loaded[i]);
        sheets.set(name, { img: loaded[i], fw: def.fw, fh: def.fh, cols: def.cols });
      });
    },

    sheet: (name) => sheets.get(name),

    /** Pre-rendered white silhouette, so a hit flash costs one extra drawImage. */
    addFlashSheet(name, flashName = `${name}Flash`) {
      const s = sheets.get(name);
      if (!s) throw new Error(`unknown sheet "${name}"`);
      const c = document.createElement('canvas');
      c.width = s.img.width;
      c.height = s.img.height;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(s.img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      sheets.set(flashName, { img: c, fw: s.fw, fh: s.fh, cols: s.cols });
    },

    draw(ctx, name, frame, x, y) {
      const s = sheets.get(name);
      const sx = (frame % s.cols) * s.fw;
      const sy = ((frame / s.cols) | 0) * s.fh;
      ctx.drawImage(s.img, sx, sy, s.fw, s.fh, Math.round(x), Math.round(y), s.fw, s.fh);
    },

    drawCentered(ctx, name, frame, cx, cy) {
      const s = sheets.get(name);
      this.draw(ctx, name, frame, cx - s.fw / 2, cy - s.fh / 2);
    },

    destroy() {
      sheets.clear();
      images.clear();
    },
  };
}
