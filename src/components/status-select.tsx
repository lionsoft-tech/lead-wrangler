import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type LeadStatus } from "@/lib/leads";

const COLOR: Record<LeadStatus, string> = {
  new: "text-status-new",
  called_back: "text-status-called",
  converted: "text-status-converted",
  lost: "text-status-lost",
};

interface Props {
  value: LeadStatus;
  onChange: (next: LeadStatus) => void;
  size?: "default" | "lg";
  fullWidth?: boolean;
}

export function StatusSelect({ value, onChange, size = "default", fullWidth }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LeadStatus)}>
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "font-medium",
          COLOR[value],
          size === "lg" ? "h-12 text-base" : "h-11 min-h-11",
          fullWidth && "w-full",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
          <SelectItem key={s} value={s} className={COLOR[s]}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
