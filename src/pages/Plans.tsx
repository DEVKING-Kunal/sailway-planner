import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, Package, TrendingUp, DollarSign, Gauge, MapPin, Calendar, AlertCircle } from "lucide-react";
import { RakeOptimizer } from "@/lib/optimizer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsAdmin, useIsSeniorPlanner, useIsPlanner } from "@/hooks/useRoles";

export default function Plans() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const isSeniorPlanner = useIsSeniorPlanner();
  const isPlanner = useIsPlanner();
  
  const canGeneratePlans = isAdmin || isSeniorPlanner || isPlanner;

  // Fetch existing plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["rake-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rake_plans")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch plan-order relationships
  const { data: planOrders } = useQuery({
    queryKey: ["rake-plan-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rake_plan_orders")
        .select(`
          *,
          order:customer_orders(*),
          plan:rake_plans(*)
        `);
      return data || [];
    },
  });

  // Generate optimized plans
  const generatePlans = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      try {
        // Fetch all required data
        const [ordersRes, inventoryRes, wagonsRes, loadingPointsRes] = await Promise.all([
          supabase.from("customer_orders").select("*").eq("status", "open"),
          supabase.from("inventory").select("*"),
          supabase.from("wagon_availability").select("*"),
          supabase.from("loading_points").select("*").eq("operational_status", "active"),
        ]);

        // Check for errors in data fetching
        if (ordersRes.error) throw new Error(`Orders fetch failed: ${ordersRes.error.message}`);
        if (inventoryRes.error) throw new Error(`Inventory fetch failed: ${inventoryRes.error.message}`);
        if (wagonsRes.error) throw new Error(`Wagons fetch failed: ${wagonsRes.error.message}`);
        if (loadingPointsRes.error) throw new Error(`Loading points fetch failed: ${loadingPointsRes.error.message}`);

        const orders = ordersRes.data || [];
        const inventory = inventoryRes.data || [];
        const wagons = wagonsRes.data || [];
        const loadingPoints = loadingPointsRes.data || [];

        // Validation checks
        if (orders.length === 0) {
          throw new Error("No open orders available to plan. Create some orders first.");
        }

        if (inventory.length === 0) {
          throw new Error("No inventory available. Add inventory before generating plans.");
        }

        if (wagons.length === 0) {
          throw new Error("No wagons available. Configure wagon availability first.");
        }

        if (loadingPoints.length === 0) {
          throw new Error("No active loading points available. Configure loading points first.");
        }

        console.log("Starting optimization with:", {
          orders: orders.length,
          inventory: inventory.length,
          wagons: wagons.length,
          loadingPoints: loadingPoints.length
        });

        // Run advanced linear programming optimization
        const optimizer = new RakeOptimizer(orders, inventory, wagons, loadingPoints);
        const result = optimizer.optimize();

        console.log("Optimization Result:", result);

        if (result.rakePlans.length === 0) {
          const reasons = [];
          if (result.unfulfilledOrders.length > 0) {
            reasons.push(`${result.unfulfilledOrders.length} orders couldn't be fulfilled`);
          }
          throw new Error(
            `Unable to create any rake plans. Possible reasons:\n` +
            `- Insufficient inventory for order quantities\n` +
            `- Not enough wagons available (minimum ${50} required per rake)\n` +
            `- Loading points incompatible with product types\n` +
            `- Order tonnage too low (minimum 2000 tonnes for economic rake)\n` +
            reasons.join(", ")
          );
        }

      // Deduplicate by rake_id and upsert to avoid unique constraint violations
      const uniquePlansMap = new Map(result.rakePlans.map((p: any) => [p.rakeId, p]));
      const uniquePlans = Array.from(uniquePlansMap.values());

      const planInserts = uniquePlans.map((plan: any) => ({
        rake_id: plan.rakeId,
        assigned_loading_point: plan.loadingPoint,
        origin_stockyard: plan.originStockyard,
        destinations: [plan.destination],
        wagon_type: plan.wagonType,
        wagon_count: plan.wagonCount,
        total_tonnage: plan.totalTonnage,
        utilization_percentage: plan.utilization * 100,
        estimated_dispatch_time: plan.estimatedDispatchTime,
        estimated_total_cost: plan.cost,
        composite_priority_score: plan.priorityScore,
      }));

      const { data: upsertedPlans, error: planError } = await supabase
        .from("rake_plans")
        .upsert(planInserts, { onConflict: "rake_id" })
        .select();

      if (planError) throw planError;

      // Link orders to plans
      const orderLinks: any[] = [];
      const byRakeId = new Map(upsertedPlans.map((p: any) => [p.rake_id, p]));
      result.rakePlans.forEach((plan: any) => {
        const dbPlan = byRakeId.get(plan.rakeId);
        if (!dbPlan) return;
        plan.orders.forEach((order: any) => {
          orderLinks.push({
            rake_plan_id: dbPlan.id,
            order_id: order.id,
            tonnage_allocated: order.tonnage_required,
          });
        });
      });

      if (orderLinks.length > 0) {
        const { error: linkError } = await supabase
          .from("rake_plan_orders")
          .insert(orderLinks);

        if (linkError) throw linkError;
      }

      // Update order statuses
      const orderIds = result.rakePlans.flatMap(p => p.orders.map(o => o.id));
      if (orderIds.length > 0) {
        await supabase
          .from("customer_orders")
          .update({ status: "planned" })
          .in("id", orderIds);
      }

        return {
          plansCreated: result.rakePlans.length,
          ordersPlanned: orderIds.length,
          unfulfilledOrders: result.unfulfilledOrders.length,
          utilizationRate: result.utilizationRate,
          totalCost: result.totalCost,
        };
      } catch (error) {
        console.error("Optimization error:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["rake-plans"] });
      queryClient.invalidateQueries({ queryKey: ["rake-plan-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      toast.success("Optimization Complete!", {
        description: `Created ${result.plansCreated} rake plans for ${result.ordersPlanned} orders. Average utilization: ${(result.utilizationRate * 100).toFixed(1)}%`,
      });

      if (result.unfulfilledOrders > 0) {
        toast.warning(`${result.unfulfilledOrders} orders could not be fulfilled`, {
          description: "Check inventory, wagon availability, or order requirements",
        });
      }
      
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast.error("Planning Failed", {
        description: error.message,
      });
      setIsGenerating(false);
    },
  });

  const utilizationColor = (util: number) => {
    if (util >= 90) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (util >= 75) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const priorityColor = (score: number) => {
    if (score >= 3.5) return "bg-[hsl(var(--critical))]/20 text-[hsl(var(--critical))] border-[hsl(var(--critical))]";
    if (score >= 2.5) return "bg-[hsl(var(--high))]/20 text-[hsl(var(--high))] border-[hsl(var(--high))]";
    if (score >= 1.5) return "bg-[hsl(var(--medium))]/20 text-[hsl(var(--medium))] border-[hsl(var(--medium))]";
    return "bg-[hsl(var(--low))]/20 text-[hsl(var(--low))] border-[hsl(var(--low))]";
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI-Optimized Rake Plans</h1>
          <p className="text-muted-foreground">
            Advanced linear programming optimization for maximum efficiency
          </p>
        </div>
        {canGeneratePlans && (
          <Button
            onClick={() => generatePlans.mutate()}
            disabled={isGenerating}
            className="bg-gradient-to-r from-primary to-blue-500 text-white shadow-glow"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Optimal Plans
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating && (
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Running advanced optimization algorithm... Analyzing constraints with multi-objective linear programming.
          </AlertDescription>
        </Alert>
      )}

      {plans && plans.length > 0 ? (
        <div className="grid gap-6">
          {plans.map((plan) => {
            const planOrdersList = planOrders?.filter(po => po.plan?.id === plan.id) || [];
            
            return (
              <Card key={plan.id} className="p-6 bg-card border-border hover:shadow-card transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{plan.rake_id}</h3>
                      <Badge className={utilizationColor(plan.utilization_percentage)}>
                        {plan.utilization_percentage.toFixed(1)}% Utilization
                      </Badge>
                      <Badge className={priorityColor(plan.composite_priority_score || 0)}>
                        Priority: {(plan.composite_priority_score || 0).toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(plan.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{plan.estimated_total_cost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  </div>
                </div>

                {/* SLA & Cost Breakdown */}
                {plan.cost_breakdown && (
                  <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">ENHANCED COST BREAKDOWN</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {Object.entries(plan.cost_breakdown as any).map(([key, value]) => {
                        if (key === 'total' || typeof value !== 'number' || value === 0) return null;
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-muted-foreground capitalize text-[10px]">{key.replace(/_/g, ' ')}</span>
                            <span className="font-semibold text-foreground">₹{(value as number).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tonnage</p>
                      <p className="text-sm font-semibold text-foreground">{plan.total_tonnage}T</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Wagons</p>
                      <p className="text-sm font-semibold text-foreground">
                        {plan.wagon_count} × {plan.wagon_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Route</p>
                      <p className="text-sm font-semibold text-foreground">
                        {plan.origin_stockyard} → {Array.isArray(plan.destinations) ? plan.destinations.join(', ') : plan.destinations[0]}
                        {plan.multi_destination && <Badge className="ml-1 text-[10px]" variant="secondary">Multi</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA Score</p>
                      <Badge variant={plan.sla_compliance_score >= 90 ? "default" : plan.sla_compliance_score >= 70 ? "secondary" : "destructive"}>
                        {plan.sla_compliance_score?.toFixed(0) || 100}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dispatch ETA</p>
                      <p className="text-sm font-semibold text-foreground">
                        {plan.estimated_dispatch_time 
                          ? new Date(plan.estimated_dispatch_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Loading Point: {plan.assigned_loading_point}</p>
                  <p className="text-xs text-muted-foreground">
                    Orders Fulfilled: {planOrdersList.length}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-card border-border border-dashed">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary/50" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Plans Generated Yet
          </h3>
          <p className="text-muted-foreground mb-6">
            {canGeneratePlans 
              ? "Click 'Generate Optimal Plans' to run the AI optimization algorithm"
              : "Only planners and above can generate rake plans"
            }
          </p>
          {canGeneratePlans && (
            <Button
              onClick={() => generatePlans.mutate()}
              disabled={isGenerating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate First Plan
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
