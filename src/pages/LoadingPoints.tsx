import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, Wrench } from "lucide-react";

export default function LoadingPoints() {
  const { data: loadingPoints, isLoading } = useQuery({
    queryKey: ["loading-points"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loading_points")
        .select("*")
        .order("point_name", { ascending: true });
      return data || [];
    },
  });

  const statusConfig = {
    active: { 
      label: "Active", 
      className: "bg-[hsl(var(--low))]/20 text-[hsl(var(--low))] border-[hsl(var(--low))]",
      icon: Activity
    },
    inactive: { 
      label: "Inactive", 
      className: "bg-secondary text-muted-foreground border-border",
      icon: MapPin
    },
    maintenance: { 
      label: "Maintenance", 
      className: "bg-[hsl(var(--medium))]/20 text-[hsl(var(--medium))] border-[hsl(var(--medium))]",
      icon: Wrench
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Loading Points</h1>
        <p className="text-muted-foreground">Manage and monitor loading point operations</p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading points...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loadingPoints?.map((point) => {
            const status = statusConfig[point.operational_status];
            const StatusIcon = status.icon;
            
            return (
              <Card key={point.id} className="p-6 bg-card border-border hover:shadow-card transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <StatusIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{point.point_name}</h3>
                      <p className="text-sm text-muted-foreground">{point.point_id}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">Capacity</span>
                    <span className="text-lg font-bold text-foreground">{point.capacity_tph} TPH</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Compatible Products</p>
                    <div className="flex flex-wrap gap-2">
                      {point.compatible_products.map((product, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="bg-secondary/50 text-foreground border-border"
                        >
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(point.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
