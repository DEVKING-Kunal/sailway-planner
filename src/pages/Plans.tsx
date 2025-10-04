import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Sparkles, MapPin, Package } from "lucide-react";
import { toast } from "sonner";

export default function Plans() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rake_plans")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: planOrders } = useQuery({
    queryKey: ["plan-orders"],
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

  const generatePlan = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      
      // Fetch all necessary data
      const [ordersResult, inventoryResult, wagonsResult, pointsResult] = await Promise.all([
        supabase.from("customer_orders").select("*").eq("status", "open").order("priority_level", { ascending: true }),
        supabase.from("inventory").select("*"),
        supabase.from("wagon_availability").select("*"),
        supabase.from("loading_points").select("*").eq("operational_status", "active")
      ]);

      const orders = ordersResult.data || [];
      const inventory = inventoryResult.data || [];
      const wagons = wagonsResult.data || [];
      const points = pointsResult.data || [];

      if (orders.length === 0) {
        throw new Error("No open orders to process");
      }

      // Simple optimization algorithm
      const priorityScores = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      };

      // Group orders by product
      const ordersByProduct = orders.reduce((acc, order) => {
        if (!acc[order.product_id]) acc[order.product_id] = [];
        acc[order.product_id].push(order);
        return acc;
      }, {} as Record<string, typeof orders>);

      const generatedPlans = [];

      // Generate rakes for each product group
      for (const [productId, productOrders] of Object.entries(ordersByProduct)) {
        // Sort by priority
        const sortedOrders = productOrders.sort((a, b) => 
          priorityScores[b.priority_level] - priorityScores[a.priority_level]
        );

        // Standard rake capacity: 4000-4200 tonnes
        const rakeCapacity = 4000;
        let currentTonnage = 0;
        let rakeOrders: typeof sortedOrders = [];
        let rakeNumber = 1;

        for (const order of sortedOrders) {
          if (currentTonnage + order.tonnage_required <= 4200) {
            rakeOrders.push(order);
            currentTonnage += order.tonnage_required;
          }

          // If we've filled a rake or this is the last order
          if (currentTonnage >= rakeCapacity || order === sortedOrders[sortedOrders.length - 1]) {
            if (rakeOrders.length > 0) {
              // Find compatible wagon type (simplified)
              const wagonType = wagons.find(w => w.available_count > 0)?.wagon_type || "BOXN";
              const wagonCount = Math.ceil(currentTonnage / 67); // ~67 tonnes per wagon

              // Find suitable loading point
              const loadingPoint = points.find(p => 
                p.compatible_products.includes(productId)
              ) || points[0];

              // Find stockyard with inventory
              const stockyard = inventory.find(i => i.product_id === productId) || inventory[0];

              // Calculate metrics
              const utilization = (currentTonnage / 4200) * 100;
              const compositeScore = rakeOrders.reduce((sum, o) => 
                sum + priorityScores[o.priority_level], 0
              );
              
              const baseCost = currentTonnage * 2.5;
              const idleCost = utilization < 95 ? (95 - utilization) * 100 : 0;
              const totalCost = baseCost + idleCost;

              const destinations = [...new Set(rakeOrders.map(o => o.destination))];

              generatedPlans.push({
                rake_id: `RK-${new Date().toISOString().split('T')[0]}-${productId}-${rakeNumber}`,
                plan_date: new Date().toISOString().split('T')[0],
                assigned_loading_point: loadingPoint?.point_id || "LP-001",
                origin_stockyard: stockyard?.stockyard_id || "SY-001",
                destinations,
                wagon_type: wagonType,
                wagon_count: wagonCount,
                total_tonnage: currentTonnage,
                utilization_percentage: utilization,
                estimated_dispatch_time: new Date(Date.now() + 3600000).toISOString(),
                estimated_total_cost: totalCost,
                composite_priority_score: compositeScore,
                orders: rakeOrders.map(o => o.id)
              });

              // Reset for next rake
              currentTonnage = 0;
              rakeOrders = [];
              rakeNumber++;
            }
          }
        }
      }

      // Insert plans
      for (const plan of generatedPlans) {
        const orderIds = plan.orders;
        delete (plan as any).orders;
        
        const { data: insertedPlan, error: planError } = await supabase
          .from("rake_plans")
          .insert([plan])
          .select()
          .single();

        if (planError) throw planError;

        // Link orders to plan
        const planOrderLinks = orderIds.map(orderId => ({
          rake_plan_id: insertedPlan.id,
          order_id: orderId,
          tonnage_allocated: 0 // Simplified
        }));

        await supabase.from("rake_plan_orders").insert(planOrderLinks);
        
        // Update order statuses
        for (const orderId of orderIds) {
          await supabase
            .from("customer_orders")
            .update({ status: "planned" })
            .eq("id", orderId);
        }
      }

      setIsGenerating(false);
      return generatedPlans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["plan-orders"] });
      toast.success(`Generated ${count} optimal rake plan(s)`);
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast.error(error.message || "Failed to generate plans");
    },
  });

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Rake Plans</h1>
          <p className="text-muted-foreground">AI-optimized dispatch planning</p>
        </div>
        <Button
          onClick={() => generatePlan.mutate()}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Plan"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading plans...</div>
      ) : plans && plans.length > 0 ? (
        <div className="grid gap-6">
          {plans.map((plan) => {
            const linkedOrders = planOrders?.filter(po => po.rake_plan_id === plan.id) || [];
            
            return (
              <Card key={plan.id} className="p-6 bg-card border-border hover:shadow-card transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{plan.rake_id}</h3>
                      <p className="text-sm text-muted-foreground">
                        Generated on {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className={`${
                        plan.utilization_percentage >= 95 
                          ? 'bg-[hsl(var(--low))]/20 text-[hsl(var(--low))] border-[hsl(var(--low))]'
                          : 'bg-[hsl(var(--medium))]/20 text-[hsl(var(--medium))] border-[hsl(var(--medium))]'
                      }`}
                    >
                      {plan.utilization_percentage.toFixed(1)}% Utilized
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Tonnage</p>
                    <p className="text-lg font-bold text-foreground">{plan.total_tonnage.toFixed(2)}T</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Wagons</p>
                    <p className="text-lg font-bold text-foreground">{plan.wagon_count} {plan.wagon_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
                    <p className="text-lg font-bold text-foreground">₹{plan.estimated_total_cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Priority Score</p>
                    <p className="text-lg font-bold text-foreground">{plan.composite_priority_score?.toFixed(1) || "N/A"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      <span className="text-muted-foreground">From:</span> {plan.origin_stockyard}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      <span className="text-muted-foreground">To:</span> {plan.destinations.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">
                      <span className="text-muted-foreground">Orders:</span> {linkedOrders.length}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-card border-border">
          <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Plans Yet</h3>
          <p className="text-muted-foreground mb-6">Generate your first optimized rake plan</p>
          <Button
            onClick={() => generatePlan.mutate()}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Plan
          </Button>
        </Card>
      )}
    </div>
  );
}
