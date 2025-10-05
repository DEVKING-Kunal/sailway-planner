import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const orderSchema = z.object({
  order_number: z.string()
    .min(3, "Order number must be at least 3 characters")
    .max(50, "Order number too long")
    .regex(/^[A-Z0-9-]+$/, "Order number must contain only uppercase letters, numbers, and hyphens"),
  customer_id: z.string()
    .min(3, "Customer ID must be at least 3 characters")
    .max(50, "Customer ID too long")
    .regex(/^[A-Z0-9-]+$/, "Customer ID must contain only uppercase letters, numbers, and hyphens"),
  customer_name: z.string()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name too long")
    .trim(),
  destination: z.string()
    .min(2, "Destination must be at least 2 characters")
    .max(100, "Destination too long"),
  product_id: z.string()
    .min(3, "Product ID must be at least 3 characters")
    .max(50, "Product ID too long")
    .regex(/^[A-Z0-9-]+$/, "Product ID must contain only uppercase letters, numbers, and hyphens"),
  product_name: z.string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name too long"),
  tonnage_required: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 10000, 
      "Tonnage must be positive and not exceed 10,000"),
  deadline_date: z.string()
    .refine(date => new Date(date) > new Date(), "Deadline must be in the future"),
  priority_level: z.enum(["critical", "high", "medium", "low"])
});

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    order_number: "",
    customer_id: "",
    customer_name: "",
    destination: "",
    product_id: "",
    product_name: "",
    tonnage_required: "",
    priority_level: "medium" as "critical" | "high" | "medium" | "low",
    deadline_date: "",
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_orders")
        .select("*")
        .order("deadline_date", { ascending: true });
      return data || [];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: typeof formData) => {
      // Validate input data
      const validation = orderSchema.safeParse(order);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        throw new Error(firstError.message);
      }

      const { error } = await supabase.from("customer_orders").insert([{
        ...order,
        tonnage_required: parseFloat(order.tonnage_required)
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully");
      setIsDialogOpen(false);
      setFormData({
        order_number: "",
        customer_id: "",
        customer_name: "",
        destination: "",
        product_id: "",
        product_name: "",
        tonnage_required: "",
        priority_level: "medium",
        deadline_date: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const filteredOrders = orders?.filter(
    (order) =>
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const priorityColors = {
    critical: "bg-[hsl(var(--critical))]/20 text-[hsl(var(--critical))] border-[hsl(var(--critical))]",
    high: "bg-[hsl(var(--high))]/20 text-[hsl(var(--high))] border-[hsl(var(--high))]",
    medium: "bg-[hsl(var(--medium))]/20 text-[hsl(var(--medium))] border-[hsl(var(--medium))]",
    low: "bg-[hsl(var(--low))]/20 text-[hsl(var(--low))] border-[hsl(var(--low))]",
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Customer Orders</h1>
          <p className="text-muted-foreground">Manage and track all customer orders</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Order</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Order Number</Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer ID</Label>
                  <Input
                    id="customer_id"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_id">Product ID</Label>
                  <Input
                    id="product_id"
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tonnage">Tonnage Required</Label>
                  <Input
                    id="tonnage"
                    type="number"
                    value={formData.tonnage_required}
                    onChange={(e) => setFormData({ ...formData, tonnage_required: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={formData.priority_level}
                    onValueChange={(value: "critical" | "high" | "medium" | "low") =>
                      setFormData({ ...formData, priority_level: value })
                    }
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline Date</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline_date}
                    onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={() => createOrder.mutate(formData)}
              disabled={createOrder.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Order
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by customer, product, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading orders...</div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders?.map((order) => (
            <Card key={order.id} className="p-6 bg-card border-border hover:shadow-card transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{order.order_number}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${priorityColors[order.priority_level]}`}>
                      {order.priority_level}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                      {order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="text-foreground font-medium">{order.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Product</p>
                      <p className="text-foreground font-medium">{order.product_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Destination</p>
                      <p className="text-foreground font-medium">{order.destination}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tonnage</p>
                      <p className="text-foreground font-medium">{order.tonnage_required}T</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(order.deadline_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
