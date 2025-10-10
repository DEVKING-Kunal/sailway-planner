import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Percent, Train, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Analytics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("performance_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const { data: rakePlans } = useQuery({
    queryKey: ["rake-plans-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rake_plans")
        .select("*, cost_breakdown")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  // Calculate current metrics
  const latestMetric = metrics?.[0];
  const previousMetric = metrics?.[1];

  // Cost breakdown analysis
  const costAnalysis = rakePlans?.reduce((acc: any, plan) => {
    const breakdown = plan.cost_breakdown as any;
    if (!breakdown) return acc;
    
    return {
      base_freight: (acc.base_freight || 0) + (breakdown.base_freight || 0),
      distance_cost: (acc.distance_cost || 0) + (breakdown.distance_cost || 0),
      loading_cost: (acc.loading_cost || 0) + (breakdown.loading_cost || 0),
      demurrage: (acc.demurrage || 0) + (breakdown.demurrage || 0),
      penalty: (acc.penalty || 0) + (breakdown.penalty || 0),
      idle_freight: (acc.idle_freight || 0) + (breakdown.idle_freight || 0),
      priority_premium: (acc.priority_premium || 0) + (breakdown.priority_premium || 0),
    };
  }, {});

  const costBreakdownData = costAnalysis ? [
    { name: "Base Freight", value: Math.round(costAnalysis.base_freight), color: "hsl(var(--primary))" },
    { name: "Distance", value: Math.round(costAnalysis.distance_cost), color: "hsl(var(--high))" },
    { name: "Loading", value: Math.round(costAnalysis.loading_cost), color: "hsl(var(--medium))" },
    { name: "Demurrage", value: Math.round(costAnalysis.demurrage), color: "hsl(var(--critical))" },
    { name: "Penalty", value: Math.round(costAnalysis.penalty), color: "hsl(var(--destructive))" },
    { name: "Idle Freight", value: Math.round(costAnalysis.idle_freight), color: "hsl(var(--low))" },
    { name: "Priority Premium", value: Math.round(costAnalysis.priority_premium), color: "hsl(var(--accent))" },
  ].filter(item => item.value > 0) : [];

  // Trend data for charts
  const trendData = metrics?.slice(0, 14).reverse().map(m => ({
    date: new Date(m.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    utilization: Math.round((m.average_utilization || 0) * 100),
    cost: Math.round((m.total_cost || 0) / 1000),
    sla: Math.round(m.sla_compliance_rate || 0),
  })) || [];

  const kpis = [
    {
      title: "Average Utilization",
      value: `${Math.round((latestMetric?.average_utilization || 0) * 100)}%`,
      change: previousMetric ? Math.round(((latestMetric?.average_utilization || 0) - (previousMetric?.average_utilization || 0)) * 100) : 0,
      icon: Percent,
      color: "text-primary",
    },
    {
      title: "SLA Compliance",
      value: `${Math.round(latestMetric?.sla_compliance_rate || 0)}%`,
      change: previousMetric ? Math.round((latestMetric?.sla_compliance_rate || 0) - (previousMetric?.sla_compliance_rate || 0)) : 0,
      icon: CheckCircle2,
      color: "text-[hsl(var(--low))]",
    },
    {
      title: "Cost per Tonne",
      value: `₹${Math.round(latestMetric?.cost_per_tonne || 0)}`,
      change: previousMetric ? Math.round((latestMetric?.cost_per_tonne || 0) - (previousMetric?.cost_per_tonne || 0)) : 0,
      icon: DollarSign,
      color: "text-[hsl(var(--high))]",
      inverse: true,
    },
    {
      title: "Rakes Formed",
      value: latestMetric?.total_rakes_formed || 0,
      change: previousMetric ? (latestMetric?.total_rakes_formed || 0) - (previousMetric?.total_rakes_formed || 0) : 0,
      icon: Train,
      color: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Performance Analytics</h1>
        <p className="text-muted-foreground">Track KPIs, trends, and cost analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.inverse ? kpi.change < 0 : kpi.change > 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          
          return (
            <Card key={kpi.title} className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                {kpi.change !== 0 && (
                  <div className={`flex items-center gap-1 ${isPositive ? 'text-[hsl(var(--low))]' : 'text-[hsl(var(--critical))]'}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{Math.abs(kpi.change)}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Utilization Trend */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Utilization Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="utilization" stroke="hsl(var(--primary))" strokeWidth={2} name="Utilization %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* SLA Compliance Trend */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">SLA Compliance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="sla" stroke="hsl(var(--low))" strokeWidth={2} name="SLA %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Cost Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Cost Breakdown</h2>
          {costBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `₹${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No cost data available
            </div>
          )}
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Cost Per Day (₹ thousands)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `₹${value}k`}
              />
              <Legend />
              <Bar dataKey="cost" fill="hsl(var(--high))" name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
