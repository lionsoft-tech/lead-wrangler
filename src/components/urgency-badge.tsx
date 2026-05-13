import { cn } from "@/lib/utils";
import { URGENCY_LABEL, type Urgency } from "@/lib/leads";

const STYLES: Record<Urgency, string> = {
  emergency:
    "bg-urg-emergency-bg text-urg-emergency-fg border-urg-emergency-border animate-urgency-pulse",
  today: "bg-urg-today-bg text-urg-today-fg border-urg-today-border",
  this_week: "bg-urg-week-bg text-urg-week-fg border-urg-week-border",
  flexible: "bg-urg-flex-bg text-urg-flex-fg border-urg-flex-border",
};

export function UrgencyBadge({
  urgency,
  className,
}: {
  urgency: Urgency | null;
  className?: string;
}) {
  const u: Urgency = urgency ?? "flexible";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        STYLES[u],
        className,
      )}
    >
      {URGENCY_LABEL[u]}
    </span>
  );
}
