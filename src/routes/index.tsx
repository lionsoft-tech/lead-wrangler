import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { ShopLeadsView } from "@/components/shop-leads-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const SHOP_KEY = "operator.selectedShopId";

function HomePage() {
  const { isOperator, user } = useAuth();
  if (!user) return null;
  return isOperator ? <OperatorHome /> : <OwnerHome />;
}

function OwnerHome() {
  const { user } = useAuth();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["my-shop", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  if (isLoading) {
    return (
      <AppShell title={<Skeleton className="h-6 w-40" />}>
        <Skeleton className="h-32 w-full" />
      </AppShell>
    );
  }

  if (!shop) {
    return (
      <AppShell title="{PRODUCT_NAME}">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No shop is linked to your account yet. Contact your operator.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${shop.name} leads`}>
      <ShopLeadsView shopId={shop.id} />
    </AppShell>
  );
}

function OperatorHome() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: shops, isLoading } = useQuery({
    queryKey: ["operator-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!shops || shops.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(SHOP_KEY) : null;
    const valid = stored && shops.find((s) => s.id === stored);
    setSelected(valid ? stored : shops[0].id);
  }, [shops]);

  useEffect(() => {
    if (selected && typeof window !== "undefined") {
      localStorage.setItem(SHOP_KEY, selected);
    }
  }, [selected]);

  const subnav = (
    <div className="flex gap-1">
      <Link
        to="/"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          path === "/"
            ? "bg-primary-soft text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Leads
      </Link>
      <Link
        to="/operator/flagged"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          path.startsWith("/operator/flagged")
            ? "bg-primary-soft text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Flagged calls
      </Link>
    </div>
  );

  return (
    <AppShell title="{PRODUCT_NAME} — Operator" subnav={subnav}>
      <div className="mb-5">
        {isLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <Select value={selected ?? ""} onValueChange={setSelected}>
            <SelectTrigger className="h-10 w-full md:w-72">
              <SelectValue placeholder="Select shop" />
            </SelectTrigger>
            <SelectContent>
              {(shops ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {selected && <ShopLeadsView shopId={selected} />}
    </AppShell>
  );
}
