import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, AlertTriangle, CheckCircle, Train } from "lucide-react";

export default function Dashboard() {
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_orders")
        .select("*")
        .order("deadline_date", { ascending: true });
      return data || [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rake_plans")
        .select("*")
        .eq("plan_date", new Date().toISOString().split('T')[0]);
      return data || [];
    },
  });

  const { data: wagons } = useQuery({
    queryKey: ["wagons"],
    queryFn: async () => {
      const { data } = await supabase.from("wagon_availability").select("*");
      return data || [];
    },
  });

  const openOrders = orders?.filter(o => o.status === 'open').length || 0;
  const criticalOrders = orders?.filter(o => o.priority_level === 'critical').length || 0;
  const todayPlans = plans?.length || 0;
  const totalWagons = wagons?.reduce((sum, w) => sum + w.available_count, 0) || 0;

  const stats = [
    {
      title: "Open Orders",
      value: openOrders,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Critical Orders",
      value: criticalOrders,
      icon: AlertTriangle,
      color: "text-[hsl(var(--critical))]",
      bgColor: "bg-[hsl(var(--critical))]/10"
    },
    {
      title: "Today's Plans",
      value: todayPlans,
      icon: CheckCircle,
      color: "text-[hsl(var(--low))]",
      bgColor: "bg-[hsl(var(--low))]/10"
    },
    {
      title: "Available Wagons",
      value: totalWagons,
      icon: Train,
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Logistics Command Center</h1>
        <p className="text-muted-foreground">Real-time overview of your operations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 bg-card border-border hover:shadow-card transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Priority Distribution</h2>
          <div className="space-y-4">
            {['critical', 'high', 'medium', 'low'].map((priority) => {
              const count = orders?.filter(o => o.priority_level === priority).length || 0;
              const colorMap: Record<string, string> = {
                critical: 'hsl(var(--critical))',
                high: 'hsl(var(--high))',
                medium: 'hsl(var(--medium))',
                low: 'hsl(var(--low))'
              };
              
              return (
                <div key={priority} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-muted-foreground capitalize">{priority}</span>
                  <div className="flex-1 h-8 bg-secondary rounded-lg overflow-hidden">
                    <div 
                      className="h-full flex items-center px-3 text-sm font-medium text-foreground transition-all"
                      style={{ 
                        width: `${orders && orders.length > 0 ? (count / orders.length) * 100 : 0}%`,
                        backgroundColor: colorMap[priority]
                      }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {orders?.slice(0, 5).map((order) => {
              const daysLeft = Math.ceil((new Date(order.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 3;
              
              return (
                <div key={order.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isUrgent ? 'bg-[hsl(var(--critical))]/20 text-[hsl(var(--critical))]' : 'bg-primary/20 text-primary'
                  }`}>
                    {daysLeft}d left
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
