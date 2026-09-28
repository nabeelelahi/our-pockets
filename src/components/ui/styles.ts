export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-card border border-border text-fg hover:bg-card-muted",
  ghost: "text-fg hover:bg-card-muted",
  danger: "bg-danger-soft text-danger hover:opacity-90",
};

export function buttonClass(variant: Variant = "primary", extra?: string): string {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    extra,
  );
}

export const inputClass =
  "block w-full min-h-11 rounded-xl border border-border bg-card px-3 text-base text-fg placeholder:text-muted " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-danger";

export const cardClass = "rounded-2xl border border-border bg-card";
