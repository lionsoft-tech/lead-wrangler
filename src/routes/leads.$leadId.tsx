import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, Phone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { UrgencyBadge } from "@/components/urgency-badge";
import { StatusSelect } from "@/components/status-select";
import { formatPhone, telHref, type Lead, type LeadStatus } from "@/lib/leads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leads/$leadId")({
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { leadId } = useParams({ from: "/leads/$leadId" });
  const idNum = Number(leadId);
  const qc = useQueryClient();
  const [celebrate, setCelebrate] = useState(false);

  const queryKey = ["lead", idNum] as const;
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", idNum)
        .maybeSingle();
      if (error) throw error;
      let recording_url: string | null = null;
      let transcript: string | null = null;
      if (lead?.call_id) {
        const { data: call } = await supabase
          .from("calls")
          .select("recording_url,transcript")
          .eq("id", lead.call_id)
          .maybeSingle();
        recording_url = call?.recording_url ?? null;
        transcript = call?.transcript ?? null;
      }
      return { lead: lead as Lead | null, recording_url, transcript };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: LeadStatus) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", idNum);
      if (error) throw error;
    },
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<typeof data>(queryKey);
      qc.setQueryData(queryKey, (old: typeof data) =>
        old?.lead ? { ...old, lead: { ...old.lead, status } } : old,
      );
      if (status === "converted") {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1200);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error("Could not update status");
    },
    onSuccess: (_d, status) => {
      if (status === "converted") toast.success("Nice — that's a win.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  return (
    <AppShell title="{PRODUCT_NAME}">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to leads
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError || !data?.lead ? (
        <Card className="p-6 text-sm text-muted-foreground">Lead not found.</Card>
      ) : (
        <LeadDetail
          data={data}
          onChangeStatus={(s) => updateStatus.mutate(s)}
          celebrate={celebrate}
        />
      )}
    </AppShell>
  );
}

function LeadDetail({
  data,
  onChangeStatus,
  celebrate,
}: {
  data: { lead: Lead; recording_url: string | null; transcript: string | null };
  onChangeStatus: (s: LeadStatus) => void;
  celebrate: boolean;
}) {
  const { lead, recording_url, transcript } = data;
  const [showTranscript, setShowTranscript] = useState(false);
  const created = new Date(lead.created_at);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {lead.caller_name ?? "Unknown caller"}
        </h2>
        <div className="mt-2">
          <UrgencyBadge urgency={lead.urgency} />
        </div>
      </div>

      {lead.caller_phone && (
        <a
          href={telHref(lead.caller_phone)}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 text-lg font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover md:h-12 md:w-auto md:self-start md:px-6 md:text-base"
        >
          <Phone className="size-5" />
          {formatPhone(lead.caller_phone)}
        </a>
      )}

      <p className="text-sm text-muted-foreground">
        Captured {formatDistanceToNowStrict(created, { addSuffix: true })} •{" "}
        {format(created, "EEEE h:mm a")}
      </p>

      {lead.vehicle && (
        <Section label="Vehicle">
          <p className="text-foreground">{lead.vehicle}</p>
        </Section>
      )}

      <Section label="What they need">
        <p className="whitespace-pre-line text-foreground">
          {lead.problem ?? <span className="text-muted-foreground">No details captured.</span>}
        </p>
      </Section>

      <Section label="Callback window">
        {lead.callback_window ? (
          <p className="text-foreground">{lead.callback_window}</p>
        ) : (
          <p className="text-muted-foreground">Not specified</p>
        )}
      </Section>

      <Section label="Status">
        <div
          className={cn(
            "relative -m-2 rounded-md p-2 transition-colors duration-700",
            celebrate && "bg-emerald-500/10",
          )}
        >
          <StatusSelect value={lead.status} onChange={onChangeStatus} size="lg" fullWidth />
          {celebrate && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <CheckCircle2
                className="size-16 animate-in zoom-in-50 fade-in text-status-converted duration-200"
                strokeWidth={2}
              />
            </div>
          )}
        </div>
      </Section>

      {recording_url && (
        <Section label="Call recording">
          <audio controls src={recording_url} className="w-full" />
        </Section>
      )}

      {transcript && (
        <Collapsible open={showTranscript} onOpenChange={setShowTranscript}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-center md:w-auto">
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm leading-relaxed text-foreground">
              {transcript}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 md:p-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </Card>
  );
}
