import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ProductionRecommender } from "@/lib/productionRecommender";
import { Sparkles, TrendingUp, Package, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useIsAdmin, useIsSeniorPlanner } from "@/hooks/useRoles";

export default function ProductionRecommendations() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const isSeniorPlanner = useIsSeniorPlanner();
  const canGenerate = isAdmin || isSeniorPlanner;

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["production-recommendations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("production_recommendations")
        .select("*")
        .order("recommendation_date", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const generateRecommendations = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      // Fetch data
      const [ordersRes, inventoryRes, wagonsRes] = await Promise.all([
        supabase.from("customer_orders").select("*").eq("status", "open"),
        supabase.from("inventory").select("*"),
        supabase.from("wagon_availability").select("*"),
      ]);

      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];
      const wagons = wagonsRes.data || [];

      // Generate recommendations using AI engine
      const recommender = new ProductionRecommender(orders, inventory, wagons);
      const recs = recommender.generateRecommendations();

      // Save to database
      const { data: user } = await supabase.auth.getUser();
      
      const recsToInsert = recs.map(rec => ({
        product_name: rec.product_name,
        recommended_tonnage: rec.recommended_tonnage,
        priority_score: rec.priority_score,
        reasoning: rec.reasoning,
        based_on_orders: rec.based_on_orders,
        transport_capacity_available: rec.transport_capacity_available,
        current_inventory: rec.current_inventory,
        created_by: user.user?.id,
      }));

      const { error } = await supabase
        .from("production_recommendations")
        .insert(recsToInsert);

      if (error) throw error;

      return recs;
    },
    onSuccess: (recs) => {
      queryClient.invalidateQueries({ queryKey: ["production-recommendations"] });
      toast({
        title: "Recommendations Generated",
        description: `Generated ${recs.length} production recommendations`,
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("production_recommendations")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-recommendations"] });
      toast({
        title: "Status Updated",
        description: "Recommendation status has been updated",
      });
    },
  });

  const getPriorityColor = (score: number) => {
    if (score >= 80) return "hsl(var(--critical))";
    if (score >= 60) return "hsl(var(--high))";
    if (score >= 40) return "hsl(var(--medium))";
    return "hsl(var(--low))";
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-[hsl(var(--critical))] text-white">Critical</Badge>;
    if (score >= 60) return <Badge className="bg-[hsl(var(--high))] text-white">High</Badge>;
    if (score >= 40) return <Badge className="bg-[hsl(var(--medium))] text-white">Medium</Badge>;
    return <Badge className="bg-[hsl(var(--low))] text-white">Low</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Production Recommendations
          </h1>
          <p className="text-muted-foreground">
            Intelligent suggestions based on order pipeline, transport capacity & inventory
          </p>
        </div>
        
        {canGenerate && (
          <Button
            onClick={() => generateRecommendations.mutate()}
            disabled={isGenerating}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI is analyzing order pipeline, transport capacity, and inventory levels...
          </p>
        </div>
      )}

      {recommendations && recommendations.length > 0 ? (
        <div className="grid gap-6">
          {recommendations.map((rec) => {
            const reasoning = rec.reasoning as any;
            
            return (
              <Card key={rec.id} className="p-6 bg-card border-border hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getPriorityColor(rec.priority_score)}15` }}
                    >
                      <Package className="h-6 w-6" style={{ color: getPriorityColor(rec.priority_score) }} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{rec.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Recommended: {rec.recommended_tonnage.toLocaleString()} tonnes
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getPriorityBadge(rec.priority_score)}
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Priority Score</p>
                      <p className="text-2xl font-bold text-foreground">{rec.priority_score}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Demand Gap</p>
                    <p className="text-lg font-semibold text-foreground">
                      {reasoning?.demand_gap?.toLocaleString() || 0}t
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pending Orders</p>
                    <p className="text-lg font-semibold text-foreground">{rec.based_on_orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transport Capacity</p>
                    <p className="text-lg font-semibold text-foreground">
                      {rec.transport_capacity_available?.toLocaleString() || 0}t
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Inventory</p>
                    <p className="text-lg font-semibold text-foreground">
                      {rec.current_inventory?.toLocaleString() || 0}t
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">AI REASONING</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Avg Priority:</span>{" "}
                      {reasoning?.avg_order_priority?.toFixed(2) || "N/A"}
                    </p>
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Urgency Score:</span>{" "}
                      {reasoning?.urgency_score || 0}/100
                    </p>
                  </div>
                </div>

                {canGenerate && rec.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: rec.id, status: "accepted" })}
                      className="bg-[hsl(var(--low))] hover:bg-[hsl(var(--low))]/90"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: rec.id, status: "rejected" })}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                {rec.status !== "pending" && (
                  <div className="pt-4 border-t border-border">
                    <Badge variant={rec.status === "accepted" ? "default" : "outline"}>
                      {rec.status.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center bg-card border-border">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Recommendations Yet</h3>
          <p className="text-muted-foreground mb-6">
            Click "Generate Recommendations" to get AI-powered production suggestions
          </p>
        </Card>
      )}
    </div>
  );
}
