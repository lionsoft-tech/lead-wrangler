import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { ShopLeadsView } from "@/components/shop-leads-view";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/operator/shops/$shopId")({
  component: OperatorShopPage,
});

function OperatorShopPage() {
  const { isOperator, loading } = useAuth();
  const navigate = useNavigate();
  const { shopId } = useParams({ from: "/operator/shops/$shopId" });

  useEffect(() => {
    if (!loading && !isOperator) navigate({ to: "/" });
  }, [loading, isOperator, navigate]);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["operator-shop", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,name")
        .eq("id", shopId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOperator,
  });

  if (loading || !isOperator) return null;

  return (
    <AppShell
      title={isLoading ? <Skeleton className="h-6 w-40" /> : `${shop?.name ?? "Shop"} leads`}
    >
      <ShopLeadsView shopId={shopId} />
    </AppShell>
  );
}
