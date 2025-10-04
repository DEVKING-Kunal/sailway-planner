import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Warehouse } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("*")
        .order("stockyard_name", { ascending: true });
      return data || [];
    },
  });

  // Group by stockyard
  const stockyards = inventory?.reduce((acc, item) => {
    if (!acc[item.stockyard_id]) {
      acc[item.stockyard_id] = {
        name: item.stockyard_name,
        products: []
      };
    }
    acc[item.stockyard_id].products.push(item);
    return acc;
  }, {} as Record<string, { name: string; products: typeof inventory }>);

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Inventory Management</h1>
        <p className="text-muted-foreground">Track stockyard levels across all locations</p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading inventory...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(stockyards || {}).map(([stockyardId, stockyard]) => (
            <Card key={stockyardId} className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Warehouse className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{stockyard.name}</h3>
                  <p className="text-sm text-muted-foreground">Stockyard ID: {stockyardId}</p>
                </div>
              </div>
              <div className="space-y-4">
                {stockyard.products.map((product) => {
                  // Assume max capacity for visualization
                  const maxCapacity = 10000;
                  const percentage = (product.tonnage_available / maxCapacity) * 100;
                  
                  return (
                    <div key={product.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{product.product_name}</span>
                        <span className="text-muted-foreground">{product.tonnage_available.toFixed(2)}T</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">Product ID: {product.product_id}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
