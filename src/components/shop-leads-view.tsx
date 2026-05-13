import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LeadList,
  LeadListSkeleton,
  type DateFilter,
  type StatusFilter,
} from "@/components/lead-list";
import type { Lead } from "@/lib/leads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "converted", label: "Converted" },
  { id: "lost", label: "Lost" },
  { id: "all", label: "All" },
];

export function ShopLeadsView({ shopId }: { shopId: string }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const queryKey = ["leads", shopId] as const;
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    enabled: Boolean(shopId),
  });

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                statusFilter === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="h-10 w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LeadListSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <LeadList
          leads={data ?? []}
          statusFilter={statusFilter}
          dateFilter={dateFilter}
          invalidateKey={queryKey}
        />
      )}
    </div>
  );
}
