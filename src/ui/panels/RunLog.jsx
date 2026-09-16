import { Label, Separator } from '../components.jsx';
import { cn } from '../cn.js';

/**
 * Score formatting and the high-score table.
 *
 * The table is local-only: these are the player's own runs, ranked against each other and
 * nobody else, so there are no pilot names to invent and the run that was just played is
 * marked rather than rewarded with a fabricated rival.
 */
const MAX_DIGITS = 9;

export function formatScore(input, format) {
  const value = Number.isFinite(input) ? Math.max(0, Math.trunc(input)) : 0;
  if (format === 'time') {
    const total = Math.max(0, Math.round(value / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (format === 'depth') return `${value}F`;
  const digits = String(value);
  return digits.length > MAX_DIGITS ? '9'.repeat(MAX_DIGITS) : digits.padStart(6, '0');
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number.isFinite(ms) ? ms : 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const relative = (at) => {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.round(hours / 24)}D AGO`;
};

const DIFFICULTY_LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

export function ScoreTable({ runs = [], latestAt = null, emptyHint = 'NO RUNS YET' }) {
  if (!runs.length) {
    return <Label className="py-6">{emptyHint}</Label>;
  }

  return (
    <div className="w-full text-xs">
      <div className="flex items-baseline gap-4 px-3 pb-2 text-muted-foreground">
        <span className="w-8 shrink-0">#</span>
        <span className="flex-1 text-left">RUN</span>
        <span className="shrink-0">SCORE</span>
      </div>
      <Separator />
      <ul className="m-0 flex list-none flex-col p-0">
        {runs.map((run, i) => {
          const latest = run.at === latestAt;
          return (
            <li
              key={run.at}
              className={cn(
                'flex items-baseline gap-4 px-3 py-3',
                latest ? 'bg-secondary text-foreground' : 'text-foreground/85',
              )}
            >
              <span className={cn('w-8 shrink-0', i === 0 ? 'text-primary' : 'text-muted-foreground')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-left text-muted-foreground">
                {DIFFICULTY_LABEL[run.meta?.difficulty] ?? 'NORMAL'}
                <span className="px-2">·</span>
                {relative(run.at)}
              </span>
              <span className={cn('shrink-0', i === 0 && 'text-primary')}>
                {formatScore(run.score, 'number')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
