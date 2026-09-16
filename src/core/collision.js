// Entities carry a centre (x, y) and a full-extent hitbox (w, h).
export const hits = (a, b) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;

export const offscreen = (e, w, h, margin = 48) =>
  e.x < -margin || e.x > w + margin || e.y < -margin || e.y > h + margin;

export const contains = (r, x, y) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
