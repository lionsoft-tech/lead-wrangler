import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { UrgencyBadge } from "./urgency-badge";
import { StatusSelect } from "./status-select";
import {
  URGENCY_RANK,
  type Lead,
  type LeadStatus,
  type Urgency,
} from "@/lib/leads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StatusFilter = "active" | "converted" | "lost" | "all";
export type DateFilter = "today" | "week" | "all";

function truncate(s: string | null, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function applyFilters(leads: Lead[], status: StatusFilter, date: DateFilter): Lead[] {
  const now = Date.now();
  const dayMs = 86_400_000;
  return leads
    .filter((l) => {
      if (status === "active") {
        if (l.status !== "new" && l.status !== "called_back") return false;
      } else if (status === "converted" && l.status !== "converted") return false;
      else if (status === "lost" && l.status !== "lost") return false;

      if (date !== "all") {
        const created = new Date(l.created_at).getTime();
        const horizon = date === "today" ? dayMs : 7 * dayMs;
        if (now - created > horizon) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ar = URGENCY_RANK[(a.urgency ?? "flexible") as Urgency];
      const br = URGENCY_RANK[(b.urgency ?? "flexible") as Urgency];
      if (ar !== br) return ar - br;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export function LeadListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-5 w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="hidden h-11 w-36 md:block" />
          </div>
        </Card>
      ))}
    </div>
  );
}

interface Props {
  leads: Lead[];
  statusFilter: StatusFilter;
  dateFilter: DateFilter;
  invalidateKey: readonly unknown[];
}

export function LeadList({ leads, statusFilter, dateFilter, invalidateKey }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: invalidateKey });
      const prev = qc.getQueryData<Lead[]>(invalidateKey);
      qc.setQueryData<Lead[]>(invalidateKey, (old) =>
        old ? old.map((l) => (l.id === id ? { ...l, status } : l)) : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(invalidateKey, ctx.prev);
      toast.error("Could not update status");
    },
    onSuccess: (_data, vars) => {
      if (vars.status === "converted") toast.success("Nice — that's a win.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });

  const filtered = applyFilters(leads, statusFilter, dateFilter);

  if (filtered.length === 0) {
    const copy =
      statusFilter === "active"
        ? "All caught up — no leads waiting."
        : "No leads match these filters.";
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="mb-4 size-12 text-primary" strokeWidth={1.5} />
        <p className="text-base text-muted-foreground">{copy}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((lead) => (
        <Card
          key={lead.id}
          onClick={() => navigate({ to: "/leads/$leadId", params: { leadId: String(lead.id) } })}
          className="cursor-pointer p-5 transition-colors hover:bg-secondary/40 md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex items-start gap-3 md:w-[110px] md:shrink-0">
              <UrgencyBadge urgency={lead.urgency} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground">
                {lead.caller_name ?? "Unknown caller"}
              </div>
              {lead.vehicle && (
                <div className="mt-0.5 truncate text-sm text-muted-foreground">
                  {lead.vehicle}
                </div>
              )}
              {lead.problem && (
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {truncate(lead.problem, 80)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 md:w-44 md:items-end md:gap-2">
              <span className="text-xs text-muted-foreground md:text-right">
                {formatDistanceToNowStrict(new Date(lead.created_at), { addSuffix: true })}
              </span>
              <div onClick={(e) => e.stopPropagation()} className="w-full">
                <StatusSelect
                  value={lead.status}
                  onChange={(next) => updateStatus.mutate({ id: lead.id, status: next })}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
