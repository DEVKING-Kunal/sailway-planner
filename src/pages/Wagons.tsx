import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Train } from "lucide-react";

export default function Wagons() {
  const { data: wagons, isLoading } = useQuery({
    queryKey: ["wagons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wagon_availability")
        .select("*")
        .order("wagon_type", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Wagon Availability</h1>
        <p className="text-muted-foreground">Real-time wagon fleet status</p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading wagons...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wagons?.map((wagon) => {
            const availabilityPercentage = (wagon.available_count / wagon.total_count) * 100;
            const isLow = availabilityPercentage < 30;
            const isMedium = availabilityPercentage >= 30 && availabilityPercentage < 70;
            
            return (
              <Card key={wagon.id} className="p-6 bg-card border-border hover:shadow-card transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Train className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{wagon.wagon_type}</h3>
                    <p className="text-sm text-muted-foreground">Wagon Type</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Fleet</span>
                    <span className="text-lg font-bold text-foreground">{wagon.total_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className={`text-lg font-bold ${
                      isLow ? 'text-[hsl(var(--critical))]' : 
                      isMedium ? 'text-[hsl(var(--medium))]' : 
                      'text-[hsl(var(--low))]'
                    }`}>
                      {wagon.available_count}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Availability</span>
                      <span className={`font-medium ${
                        isLow ? 'text-[hsl(var(--critical))]' : 
                        isMedium ? 'text-[hsl(var(--medium))]' : 
                        'text-[hsl(var(--low))]'
                      }`}>
                        {availabilityPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={availabilityPercentage} 
                      className={`h-2 ${
                        isLow ? '[&>div]:bg-[hsl(var(--critical))]' : 
                        isMedium ? '[&>div]:bg-[hsl(var(--medium))]' : 
                        '[&>div]:bg-[hsl(var(--low))]'
                      }`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">In Use</span>
                    <span className="font-medium text-foreground">{wagon.total_count - wagon.available_count}</span>
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
