import type { CategoryStatus } from "@/lib/budget-math";
import { cn } from "@/components/ui/styles";

const BAR: Record<CategoryStatus, string> = {
  ok: "bg-accent",
  low: "bg-warn",
  full: "bg-warn",
  over: "bg-danger",
};

export function ProgressBar({ percent, status, label }: { percent: number; status: CategoryStatus; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 w-full overflow-hidden rounded-full bg-track"
    >
      <div className={cn("h-full rounded-full", BAR[status])} style={{ width: `${percent}%` }} />
    </div>
  );
}
