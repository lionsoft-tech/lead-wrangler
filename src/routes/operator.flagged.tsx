import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/leads";

export const Route = createFileRoute("/operator/flagged")({
  component: FlaggedPage,
});

interface FlaggedRow {
  id: string;
  shop_id: string | null;
  started_at: string | null;
  duration_sec: number | null;
  recording_url: string | null;
  transcript: string | null;
  shop: { name: string } | null;
}

function FlaggedPage() {
  const { isOperator, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isOperator) navigate({ to: "/" });
  }, [loading, isOperator, navigate]);

  if (loading || !isOperator) return null;

  return (
    <AppShell title="{PRODUCT_NAME} — Operator">
      <FlaggedList />
    </AppShell>
  );
}

function FlaggedList() {
  const qc = useQueryClient();
  const queryKey = ["flagged-calls"] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select(
          "id,shop_id,started_at,duration_sec,recording_url,transcript,shop:shops(name)",
        )
        .eq("flagged_for_review", true)
        .eq("reviewed_by_operator", false)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FlaggedRow[];
    },
  });

  const markReviewed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calls")
        .update({ reviewed_by_operator: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<FlaggedRow[]>(queryKey);
      qc.setQueryData<FlaggedRow[]>(queryKey, (old) =>
        old ? old.filter((r) => r.id !== id) : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="mb-4 size-12 text-primary" strokeWidth={1.5} />
        <p className="text-base text-muted-foreground">No flagged calls — nice work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => (
        <Card
          key={row.id}
          className="overflow-hidden p-5 transition-[opacity,height] duration-200 md:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{row.shop?.name ?? "Unknown shop"}</div>
              <div className="text-xs text-muted-foreground">
                {row.started_at
                  ? formatDistanceToNowStrict(new Date(row.started_at), { addSuffix: true })
                  : "—"}{" "}
                • {formatDuration(row.duration_sec)}
              </div>
            </div>
          </div>

          {row.transcript && (
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
              {row.transcript.slice(0, 200)}
              {row.transcript.length > 200 ? "…" : ""}
            </p>
          )}

          {row.recording_url && (
            <audio controls src={row.recording_url} className="mt-3 w-full" />
          )}

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => markReviewed.mutate(row.id)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              Mark reviewed
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
