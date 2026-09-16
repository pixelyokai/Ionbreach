// Order matches the row order baked into assets/sprites/powerup.png by tools/build-assets.js.
export const POWERUP_TYPES = [
  { id: 'spread', row: 0, label: 'SPREAD', timed: true },
  { id: 'rapid', row: 1, label: 'RAPID', timed: true },
  { id: 'shield', row: 2, label: 'SHIELD', timed: false },
  { id: 'life', row: 3, label: '1UP', timed: false },
];

// Weighted draw: extra lives stay rare, the two fire upgrades carry the run.
const WEIGHTS = [34, 34, 26, 6];

export function rollPowerupType() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return POWERUP_TYPES[i];
  }
  return POWERUP_TYPES[0];
}
