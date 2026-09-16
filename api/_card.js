/**
 * The share card's layout, as a Satori element tree.
 *
 * Kept separate from the endpoint so the same tree can be rendered from a local script and
 * looked at (`node tools/preview-card.mjs`). A card that is only ever seen after a deploy
 * is a card nobody checks.
 *
 * Written with a `h()` helper rather than JSX: this file is built by Vercel's function
 * builder, not by Vite, and a plain .js module needs no transform anywhere.
 *
 * Satori is not a browser. It lays out flexbox and draws text, and that is close to all of
 * it: no filters, no background-clip, no pseudo-elements, and every element that has more
 * than one child needs an explicit `display: flex`.
 */
const h = (type, style, children) => ({
  type,
  props: {
    style: { display: 'flex', ...style },
    ...(children == null ? {} : { children }),
  },
});

const text = (content, style) => h('div', style, String(content));

export const WIDTH = 1200;
export const HEIGHT = 630;

const INK = '#ecdcc9';
const DIM = '#9b8574';
const TORCH = '#e8974a';
const GOLD = '#f2c14e';
const WIN = '#6fcf5f';
const LOSS = '#e2564a';
const GROUND = '#161210';

const group = (style, children) => h('div', { flexDirection: 'column', ...style }, children);

/** The corner brackets, as four absolutely placed L shapes. */
function brackets() {
  const arm = 34;
  const thick = 5;
  const inset = 22;
  const corner = (x, y, flipX, flipY) => [
    h('div', {
      position: 'absolute',
      [flipX ? 'right' : 'left']: x,
      [flipY ? 'bottom' : 'top']: y,
      width: arm,
      height: thick,
      backgroundColor: TORCH,
    }),
    h('div', {
      position: 'absolute',
      [flipX ? 'right' : 'left']: x,
      [flipY ? 'bottom' : 'top']: y,
      width: thick,
      height: arm,
      backgroundColor: TORCH,
    }),
  ];
  return [
    ...corner(inset, inset, false, false),
    ...corner(inset, inset, true, false),
    ...corner(inset, inset, false, true),
    ...corner(inset, inset, true, true),
  ];
}

/** The scanline comb, as a stack of hairlines. A repeating gradient is not supported. */
function scanlines() {
  const rows = [];
  for (let y = 0; y < HEIGHT; y += 4) {
    rows.push(
      h('div', {
        position: 'absolute',
        left: 0,
        top: y,
        width: WIDTH,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.022)',
      }),
    );
  }
  return rows;
}

const statRow = (label, value, valueColour) =>
  h('div', { justifyContent: 'space-between', width: 436, fontSize: 22 }, [
    text(label, { color: DIM }),
    text(value, { color: valueColour ?? INK }),
  ]);

/**
 * @param {object} run  { won, score, sector, sectors, difficulty, best }
 */
export function card(run) {
  const won = Boolean(run.won);
  const accent = won ? WIN : LOSS;

  return h(
    'div',
    {
      width: WIDTH,
      height: HEIGHT,
      position: 'relative',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: GROUND,
      fontFamily: 'Press Start 2P',
      padding: '52px 70px',
    },
    [
      ...scanlines(),
      ...brackets(),

      text('IONBREACH', {
        fontSize: 84,
        color: GOLD,
        letterSpacing: 4,
        textShadow: `5px 5px 0 #6b4207, 0 0 34px rgba(255,186,90,0.45)`,
      }),
      text('DODGE. SHOOT. SURVIVE. REPEAT.', {
        fontSize: 26,
        color: INK,
        letterSpacing: 2,
        marginTop: 26,
      }),

      h('div', { marginTop: 74, alignItems: 'center', width: '100%' }, [
        // The outcome, boxed and tinted, so it reads before anything else does.
        group(
          {
            border: `3px solid ${accent}`,
            backgroundColor: won ? 'rgba(111,207,95,0.08)' : 'rgba(226,86,74,0.08)',
            padding: '26px 30px',
            gap: 18,
            // Wide enough for MISSION COMPLETE on one line: the face is monospace, so the
            // longest label is 16 characters at 28px plus the padding.
            width: 560,
          },
          [
            text(shareCopy(run).outcome, { fontSize: 28, color: accent }),
            // A gap rather than a trailing space in the label - Satori collapses it.
            h('div', { fontSize: 32, color: INK, gap: 14 }, [
              text('SCORE:', { color: DIM }),
              text(padScore(run.score), {}),
            ]),
          ],
        ),

        group({ marginLeft: 56, gap: 22 }, [
          statRow('BEST SCORE', padScore(run.best), TORCH),
          statRow('DIFFICULTY', difficultyName(run.difficulty).toUpperCase()),
          statRow('SECTORS', `${run.sector} / ${run.sectors}`),
        ]),
      ]),

      text('Can you beat my score?', {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 58,
        justifyContent: 'center',
        fontSize: 26,
        color: TORCH,
      }),
    ],
  );
}

const DIFFICULTY_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const SECTORS = 3;

const digits = (v, fallback = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 999999999) : fallback;
};

/**
 * Query parameters are public input: anything can call these endpoints with anything. Every
 * field is clamped or mapped to a known value, so the worst a crafted URL produces is a
 * boring card rather than a forged one or a broken render.
 *
 * Raw values come back, not display strings - the card pads the score to six digits and
 * the tweet copy groups it in thousands, and neither should have to undo the other.
 */
export function readRun(params) {
  const won = params.get('o') === 'won';
  const key = params.get('d');
  return {
    won,
    score: digits(params.get('s')),
    // A win is every sector by definition, so it is not taken on trust from the URL.
    sector: won ? SECTORS : Math.min(Math.max(digits(params.get('k'), 1), 1), SECTORS),
    sectors: SECTORS,
    difficulty: DIFFICULTY_NAMES[key] ? key : 'normal',
    best: digits(params.get('b')),
  };
}

export const padScore = (n) => String(n).padStart(6, '0');
export const difficultyName = (id) => DIFFICULTY_NAMES[id] ?? DIFFICULTY_NAMES.normal;

/**
 * The words that travel with a share, in one place: the tweet, the page title and the
 * card's own labels all have to agree, and three copies of the same sentence drift.
 */
export function shareCopy(run) {
  const outcome = run.won ? 'MISSION COMPLETE' : 'GAME OVER';
  return {
    outcome,
    title: `Ionbreach — ${outcome}`,
    description:
      `Score: ${run.score.toLocaleString('en-US')} · ` +
      `Sector ${run.sector}/${run.sectors} · ${difficultyName(run.difficulty)}`,
    cta: 'Can you beat it?',
  };
}
