import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Card, CardTitle, Frame, Label, LEDE_GAP, MenuButton, Modal, Score,
} from './components.jsx';
import { ScoreTable, formatScore } from './panels/RunLog.jsx';
import { isMuted, onMuteChange, setMuted } from '../core/audio.js';
import shipUrl from '../games/ionbreach/assets/sprites/ship.png';
import { cn } from './cn.js';

const AUTHOR_URL = 'https://x.com/pixelyokai';

function useMuted() {
  return useSyncExternalStore(onMuteChange, isMuted, () => false);
}

/** Every full-screen panel carries the same footer, so it is written once. */
function MadeBy() {
  return (
    <Label className="text-xs">
      Made by{' '}
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline underline-offset-4 hover:text-foreground"
      >
        @pixelyokai
      </a>
    </Label>
  );
}

/**
 * The panels are all one shape: a framed column of full-width rows. Buttons are stacked
 * rather than laid out in a grid because the list is short and a single column keeps the
 * keyboard order and the reading order identical.
 */
function Screen({ title, subtitle, children, footer = true, className, titleClassName }) {
  return (
    <Card
      className={cn('pointer-events-auto w-[min(92vw,620px)]', className)}
      innerClassName="gap-8 px-10 py-10"
    >
      <div className="flex flex-col items-center gap-2">
        <CardTitle as="h1" className={cn('title-plate text-2xl tracking-wide', titleClassName)}>
          {title}
        </CardTitle>
        {subtitle && <Label className="text-xs">{subtitle}</Label>}
      </div>
      {children}
      {footer && <MadeBy />}
    </Card>
  );
}

/**
 * A column of menu rows.
 *
 * The 8bit button frame is drawn by spans that sit 6px outside the button's own box, top
 * and bottom, so 12px of any gap is spent before a pixel of it shows: gap-6 renders as the
 * 12px of daylight between rows, and the 16px of padding renders as 16px of clear air
 * between the group and whatever sits above and below it.
 */
const Stack = ({ className, children }) => (
  <div className={cn('flex w-full flex-col gap-6 py-4', className)}>{children}</div>
);

function Title({ tagline, hints = [], difficultyName, onStart, onDifficulty, onScores }) {
  const muted = useMuted();
  return (
    <Screen title="IONBREACH" subtitle={tagline} titleClassName="text-3xl">
      <Stack>
        <MenuButton variant="default" onClick={onStart} autoFocus>
          START
        </MenuButton>
        <MenuButton value={difficultyName} onClick={onDifficulty}>
          DIFFICULTY
        </MenuButton>
        <MenuButton value={muted ? 'OFF' : 'ON'} onClick={() => setMuted(!muted)}>
          SOUND
        </MenuButton>
        <MenuButton onClick={onScores}>YOUR SCORES</MenuButton>
      </Stack>

      {hints.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          {hints.map((h) => (
            <Label key={h} className="text-xs">
              {h}
            </Label>
          ))}
        </div>
      )}
    </Screen>
  );
}

/**
 * Difficulty. The rows are radios, not buttons: exactly one is chosen, and arrow keys
 * moving between them is behaviour a radio group gets for free from the platform.
 */
function Difficulty({ options = [], selected, onConfirm, onBack }) {
  const [choice, setChoice] = useState(selected);

  useEffect(() => setChoice(selected), [selected]);

  const move = (delta) => {
    const i = options.findIndex((o) => o.id === choice);
    const next = options[(i + delta + options.length) % options.length];
    if (next) setChoice(next.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <Screen title="DIFFICULTY" subtitle="CHOOSE A CHALLENGE" footer={false}>
      <div
        role="radiogroup"
        aria-label="Difficulty"
        onKeyDown={onKeyDown}
        className="flex w-full flex-col gap-3"
      >
        {options.map((o) => {
          const active = o.id === choice;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              autoFocus={active}
              onClick={() => setChoice(o.id)}
              className={cn(
                'retro flex cursor-pointer flex-col gap-4 border-2 p-4 text-left outline-none transition-colors',
                active
                  ? 'border-ring bg-secondary text-foreground'
                  : 'border-border bg-transparent text-foreground/70 hover:border-ring/60',
              )}
            >
              <span className="flex items-baseline justify-between gap-4 text-xs">
                <span className={active ? 'text-primary' : undefined}>{o.name}</span>
                {active && <span className="text-primary">[ SELECTED ]</span>}
              </span>
              <span className="flex flex-col gap-1.5 text-xs leading-tight text-muted-foreground">
                <span>{o.blurb}</span>
                <span>{o.stats}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Stack>
        <MenuButton variant="default" onClick={() => onConfirm(choice)}>
          CONFIRM
        </MenuButton>
        <MenuButton onClick={onBack}>BACK</MenuButton>
      </Stack>

      <Label className="text-xs">Arrows to select · Enter to confirm</Label>
    </Screen>
  );
}

function Scores({ runs = [], best, latestAt, onBack, onReset }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Screen title="YOUR SCORES" subtitle="SAVED IN THIS BROWSER ONLY">
      {best != null && (
        <Label className="text-base">
          BEST <span className="text-primary">{formatScore(best, 'number')}</span>
        </Label>
      )}

      <ScoreTable runs={runs} latestAt={latestAt} />

      <Stack>
        <MenuButton variant="default" onClick={onBack} autoFocus>
          BACK TO MENU
        </MenuButton>
        {confirming ? (
          <>
            <Label className="text-xs">This cannot be undone.</Label>
            <MenuButton
              variant="destructive"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              YES, ERASE EVERYTHING
            </MenuButton>
            <MenuButton onClick={() => setConfirming(false)}>CANCEL</MenuButton>
          </>
        ) : (
          <MenuButton onClick={() => setConfirming(true)} disabled={!runs.length}>
            RESET SCORES
          </MenuButton>
        )}
      </Stack>
    </Screen>
  );
}

function Pause({ onResume, onRestart, onExit }) {
  const muted = useMuted();
  return (
    <Modal open title="PAUSED" onOpenChange={(open) => !open && onResume?.()}>
      <Stack>
        <MenuButton variant="default" onClick={onResume} autoFocus>
          RESUME
        </MenuButton>
        <MenuButton onClick={onRestart}>RESTART</MenuButton>
        <MenuButton value={muted ? 'OFF' : 'ON'} onClick={() => setMuted(!muted)}>
          SOUND
        </MenuButton>
        {onExit && <MenuButton onClick={onExit}>QUIT TO MENU</MenuButton>}
      </Stack>
      <MadeBy />
    </Modal>
  );
}

const StatRow = ({ label, value }) => (
  <Frame className="w-full border-y-2" innerClassName="px-4 py-3">
    <span className="flex items-baseline justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-primary">{value}</span>
    </span>
  </Frame>
);

function Result({
  title, subtitle, score, best, newBest, stats = [], actionLabel,
  onAction, onExit, onShare, shareLabel, tone = 'default',
}) {
  return (
    <Modal open title={title} subtitle={subtitle} onOpenChange={() => {}}>
      <div className={cn('flex flex-col items-center', LEDE_GAP)}>
        <Score className={tone === 'destructive' ? 'text-destructive' : undefined}>
          {formatScore(score, 'number')}
        </Score>
        {newBest ? (
          <Label className="text-xs text-primary">★ NEW HIGH SCORE ★</Label>
        ) : (
          best != null && (
            <Label className="text-xs">
              BEST <span className="text-primary">{formatScore(best, 'number')}</span>
            </Label>
          )
        )}
      </div>

      {stats.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          {stats.map((s) => (
            <StatRow key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      <Stack>
        <MenuButton variant="default" onClick={onAction} autoFocus>
          {actionLabel}
        </MenuButton>
        {onShare && <MenuButton onClick={onShare}>{shareLabel ?? 'SHARE ON X (TWITTER)'}</MenuButton>}
        {onExit && <MenuButton onClick={onExit}>BACK TO MENU</MenuButton>}
      </Stack>
      <MadeBy />
    </Modal>
  );
}

/**
 * 404, after 8bitcn's not-found1 block: the code as a slab, a pixel-art figure under it,
 * a heading, a line of explanation, and one way out.
 *
 * The block's placeholder ogre is replaced with the player's own ship, drawn straight from
 * the spritesheet - a background-position crop at a whole-number scale, so the art is the
 * same pixels the game flies and nothing resamples.
 */
function NotFound({ path, onHome }) {
  const scale = 7;
  return (
    <Card
      className="pointer-events-auto w-[min(92vw,620px)]"
      innerClassName="gap-6 px-10 py-12"
    >
      <p className="retro title-plate m-0 text-[64px] leading-none">404</p>

      <div
        aria-hidden="true"
        className="pixelated shrink-0"
        style={{
          width: 24 * scale,
          height: 16 * scale,
          backgroundImage: `url(${shipUrl})`,
          backgroundSize: `${120 * scale}px ${32 * scale}px`,
          backgroundPosition: '0 0',
        }}
      />

      <div className={cn('flex flex-col items-center', LEDE_GAP)}>
        <CardTitle as="h1" className="text-xl text-foreground">
          OFF THE MAP
        </CardTitle>
        <Label className="text-xs">
          {path ? `No sector at ${path}.` : 'That sector does not exist.'} Turn back before
          the fuel runs out.
        </Label>
      </div>

      <Stack>
        <MenuButton variant="default" onClick={onHome} autoFocus>
          RETURN TO BASE
        </MenuButton>
      </Stack>

      <MadeBy />
    </Card>
  );
}

function Loading({ title }) {
  return (
    <Card className="pointer-events-auto">
      <CardTitle>{title}</CardTitle>
      <Label>LOADING</Label>
    </Card>
  );
}

function ErrorPanel({ message, onBack }) {
  return (
    <Card className="pointer-events-auto">
      <CardTitle className="text-destructive">SOMETHING BROKE</CardTitle>
      <Label>{message}</Label>
      <Button variant="default" onClick={onBack} autoFocus>
        RELOAD
      </Button>
    </Card>
  );
}

/** Panels that are not modals, and so have no Radix overlay to dim the field for them. */
const NEEDS_BACKDROP = new Set(['title', 'difficulty', 'scores', 'loading', 'error', 'notFound']);

const PANELS = {
  title: Title,
  difficulty: Difficulty,
  scores: Scores,
  pause: Pause,
  result: Result,
  loading: Loading,
  error: ErrorPanel,
  notFound: NotFound,
};

function Overlay({ bridge }) {
  const [{ panel, props }, setState] = useState(bridge.current);

  useEffect(() => bridge.subscribe(setState), [bridge]);

  if (!panel) return null;
  const Panel = PANELS[panel];
  if (!Panel) {
    console.warn(`unknown ui panel "${panel}"`);
    return null;
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-center overflow-y-auto p-4">
      {NEEDS_BACKDROP.has(panel) && (
        <div aria-hidden="true" className="absolute inset-0 bg-background/75" />
      )}
      <div className="relative">
        <Panel {...props} />
      </div>
    </div>
  );
}

/** Mounts once for the life of the page; the cartridge comes and goes beneath it. */
export function mountUi(container, bridge) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Overlay bridge={bridge} />
    </StrictMode>,
  );
  return () => root.unmount();
}
