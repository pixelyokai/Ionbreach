import { AlertDialog } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { cn } from './cn.js';

/**
 * The 8bitcn component set, in JSX.
 *
 * shadcn-style libraries are copy-in rather than imported, so these live in the repo like
 * any other source file. The visual language is 8bitcn's and is reproduced the way the
 * library actually builds it: the stepped pixel frame is offset borders and absolutely
 * positioned spans, not a box-shadow approximation. That matters at the corners, which is
 * the whole tell of the style.
 *
 * Colours come from the theme tokens in theme.css (8bitcn's "dungeon torch"), so nothing
 * here names a colour directly.
 */

/** The spans that draw a button's stepped border, plus the bars that bevel it. */
function ButtonFrame({ size, variant }) {
  if (variant === 'ghost' || variant === 'link') return null;

  if (size === 'icon') {
    return (
      <span aria-hidden="true" className="pointer-events-none contents">
        <span className="absolute top-0 left-0 h-1.5 w-full bg-ring" />
        <span className="absolute bottom-0 h-1.5 w-full bg-ring" />
        <span className="absolute top-1 -left-1.5 h-1/2 w-1.5 bg-ring" />
        <span className="absolute bottom-1 -left-1.5 h-1/2 w-1.5 bg-ring" />
        <span className="absolute top-1 -right-1.5 h-1/2 w-1.5 bg-ring" />
        <span className="absolute -right-1.5 bottom-1 h-1/2 w-1.5 bg-ring" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="pointer-events-none contents">
      <span className="absolute -top-1.5 left-1.5 h-1.5 w-1/2 bg-ring" />
      <span className="absolute -top-1.5 right-1.5 h-1.5 w-1/2 bg-ring" />
      <span className="absolute -bottom-1.5 left-1.5 h-1.5 w-1/2 bg-ring" />
      <span className="absolute -bottom-1.5 right-1.5 h-1.5 w-1/2 bg-ring" />
      <span className="absolute top-0 left-0 size-1.5 bg-ring" />
      <span className="absolute top-0 right-0 size-1.5 bg-ring" />
      <span className="absolute bottom-0 left-0 size-1.5 bg-ring" />
      <span className="absolute right-0 bottom-0 size-1.5 bg-ring" />
      <span className="absolute top-1.5 -left-1.5 h-[calc(100%-12px)] w-1.5 bg-ring" />
      <span className="absolute top-1.5 -right-1.5 h-[calc(100%-12px)] w-1.5 bg-ring" />

      <span className="absolute top-0 left-0 h-1.5 w-full bg-black/20" />
      <span className="absolute top-1.5 left-0 h-1.5 w-3 bg-black/20" />
      <span className="absolute bottom-0 left-0 h-1.5 w-full bg-black/20" />
      <span className="absolute right-0 bottom-1.5 h-1.5 w-3 bg-black/20" />
    </span>
  );
}

const buttonVariants = cva(
  'retro relative inline-flex shrink-0 items-center justify-center gap-2 rounded-none border-none ' +
    'cursor-pointer select-none whitespace-nowrap outline-none ' +
    'transition-transform active:translate-y-1 focus-visible:translate-y-0.5 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/85',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        destructive: 'bg-destructive text-foreground hover:bg-destructive/85',
        ghost: 'bg-transparent text-foreground hover:bg-secondary/60',
        link: 'bg-transparent text-primary underline underline-offset-4',
      },
      size: {
        default: 'min-h-12 px-5 py-3 text-xs',
        sm: 'min-h-10 px-4 py-2 text-xs',
        lg: 'min-h-14 px-6 py-4 text-sm',
        icon: 'size-12 p-0 text-xs',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'default' },
  },
);

export function Button({ className, variant, size, children, ...props }) {
  return (
    <button type="button" className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
      <ButtonFrame size={size} variant={variant} />
    </button>
  );
}

/**
 * A menu row: a full-width button with a label on the left and its current value on the
 * right. The value sits inside the button, so a screen reader reads "DIFFICULTY NORMAL"
 * rather than leaving the setting invisible.
 */
export function MenuButton({ className, value, children, ...props }) {
  return (
    <Button className={cn('w-full justify-between gap-6 text-left', className)} {...props}>
      <span>{children}</span>
      {value != null && <span className="text-primary">{value}</span>}
    </Button>
  );
}

/**
 * 8bitcn's frame: two borders offset past each other so the corners step instead of
 * meeting. The element carries the horizontal pair, an inset overlay the vertical pair.
 */
export function Frame({ className, innerClassName, children, ...props }) {
  return (
    <div
      className={cn('panel-texture relative border-y-6 border-ring bg-card text-card-foreground', className)}
      {...props}
    >
      <div className={cn('retro relative z-[1] flex h-full w-full flex-col', innerClassName)}>{children}</div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -mx-1.5 border-x-6 border-inherit"
      />
    </div>
  );
}

export function Card({ className, innerClassName, ...props }) {
  return (
    <Frame
      className={className}
      innerClassName={cn('items-center gap-6 p-8 text-center', innerClassName)}
      {...props}
    />
  );
}

export function CardTitle({ className, as: As = 'h2', ...props }) {
  return <As className={cn('retro m-0 text-xl text-primary', className)} {...props} />;
}

export function Label({ className, ...props }) {
  return (
    <p className={cn('retro m-0 text-xs leading-relaxed text-muted-foreground', className)} {...props} />
  );
}

export function Score({ className, ...props }) {
  return <p className={cn('retro m-0 text-3xl text-foreground', className)} {...props} />;
}

/** The library's dashed rule: a repeating gradient, three parts ink to one part gap. */
export function Separator({ className }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'h-0.5 w-full shrink-0 bg-[length:16px_8px]',
        'bg-[linear-gradient(90deg,var(--ring)_75%,transparent_75%)]',
        className,
      )}
    />
  );
}

/**
 * The gap between a heading and the line that reads under it, used for the modal's
 * title/subtitle pair and for the score/best pair so the two stay locked together.
 *
 * It is deliberately much tighter than the gap between the blocks themselves: a pair
 * spaced wider than its neighbours reads as two separate things, and the subtitle starts
 * looking like it belongs to whatever comes next.
 */
export const LEDE_GAP = 'gap-1.5';

/**
 * Modal panel. Radix owns focus trapping, escape handling and the accessible title, which
 * is exactly the part worth not hand-rolling for every screen.
 */
export function Modal({
  open,
  title,
  subtitle,
  description,
  children,
  onOpenChange,
  className,
  contentClassName,
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-background/70" />
        <AlertDialog.Content
          className={cn(
            'retro fixed top-1/2 left-1/2 z-[61] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2',
            'panel-texture max-h-[92vh] border-y-6 border-ring bg-card text-card-foreground',
            className,
          )}
        >
          <div
            className={cn(
              'relative z-[1] flex max-h-[calc(92vh-12px)] flex-col items-center gap-6',
              'overflow-y-auto p-10 pb-[60px] text-center',
              contentClassName,
            )}
          >
            <div className={cn('flex flex-col items-center', LEDE_GAP)}>
              <AlertDialog.Title className="retro title-plate m-0 text-xl">{title}</AlertDialog.Title>
              {subtitle && (
                <p className="retro m-0 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <AlertDialog.Description asChild>
              <div className="contents">
                {description ?? <span className="sr-only">{title}</span>}
              </div>
            </AlertDialog.Description>
            {children}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -mx-1.5 border-x-6 border-inherit"
          />
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
