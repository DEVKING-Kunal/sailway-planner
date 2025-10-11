import { BUSINESS_RULES } from './constants';

// AI-based Production Recommendation Engine

interface Order {
  product_name: string;
  tonnage_required: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  deadline_date: string;
  transport_mode: string;
}

interface InventoryItem {
  product_name: string;
  tonnage_available: number;
}

interface Wagon {
  wagon_type: string;
  available_count: number;
}

interface ProductionRecommendation {
  product_name: string;
  recommended_tonnage: number;
  priority_score: number;
  reasoning: {
    demand_gap: number;
    pending_orders: number;
    avg_order_priority: number;
    transport_capacity: number;
    current_inventory: number;
    urgency_score: number;
  };
  based_on_orders: number;
  transport_capacity_available: number;
  current_inventory: number;
}

export class ProductionRecommender {
  private orders: Order[];
  private inventory: InventoryItem[];
  private wagons: Wagon[];

  constructor(orders: Order[], inventory: InventoryItem[], wagons: Wagon[]) {
    this.validateInputData(orders, inventory, wagons);
    this.orders = orders.filter(o => o); // Filter out null/undefined
    this.inventory = inventory;
    this.wagons = wagons;
  }

  private validateInputData(orders: Order[], inventory: InventoryItem[], wagons: Wagon[]): void {
    // Validate orders array
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new Error('Orders array is required and must not be empty');
    }

    orders.forEach((order, index) => {
      if (!order) return; // Will be filtered out
      
      if (!order.tonnage_required || order.tonnage_required <= 0) {
        throw new Error(`Order ${index}: Invalid tonnage (${order.tonnage_required}). Must be positive.`);
      }
      
      if (order.tonnage_required > 10000) {
        throw new Error(`Order ${index}: Tonnage ${order.tonnage_required} exceeds maximum of 10,000 tonnes`);
      }

      if (!order.deadline_date) {
        throw new Error(`Order ${index}: Missing deadline date`);
      }

      const deadline = new Date(order.deadline_date);
      if (isNaN(deadline.getTime())) {
        throw new Error(`Order ${index}: Invalid deadline date format`);
      }

      if (!['critical', 'high', 'medium', 'low'].includes(order.priority_level)) {
        throw new Error(`Order ${index}: Invalid priority level (${order.priority_level})`);
      }

      if (!order.product_name || order.product_name.trim() === '') {
        throw new Error(`Order ${index}: Product name is required`);
      }
    });

    // Validate inventory array
    if (!Array.isArray(inventory)) {
      throw new Error('Inventory array is required');
    }

    inventory.forEach((item, index) => {
      if (item.tonnage_available < 0) {
        throw new Error(`Inventory ${index}: Invalid tonnage (${item.tonnage_available}). Must be non-negative.`);
      }

      if (!item.product_name || item.product_name.trim() === '') {
        throw new Error(`Inventory ${index}: Product name is required`);
      }
    });

    // Validate wagons array
    if (!Array.isArray(wagons)) {
      throw new Error('Wagons array is required');
    }

    wagons.forEach((wagon, index) => {
      if (wagon.available_count < 0) {
        throw new Error(`Wagon ${index}: Available count must be non-negative`);
      }

      if (!wagon.wagon_type || wagon.wagon_type.trim() === '') {
        throw new Error(`Wagon ${index}: Wagon type is required`);
      }
    });
  }

  /**
   * Generate AI-based production recommendations
   * Analyzes: order pipeline, transport capacity, inventory levels, deadlines
   */
  generateRecommendations(): ProductionRecommendation[] {
    const recommendations: ProductionRecommendation[] = [];
    
    // Group orders by product
    const productGroups = this.groupOrdersByProduct();
    
    for (const [productName, orders] of Object.entries(productGroups)) {
      const rec = this.analyzeProductDemand(productName, orders);
      if (rec && rec.priority_score > 50) { // Only recommend if priority > 50
        recommendations.push(rec);
      }
    }
    
    // Sort by priority score (highest first)
    return recommendations.sort((a, b) => b.priority_score - a.priority_score);
  }

  private groupOrdersByProduct(): Record<string, Order[]> {
    const groups: Record<string, Order[]> = {};
    
    this.orders.forEach(order => {
      if (!groups[order.product_name]) {
        groups[order.product_name] = [];
      }
      groups[order.product_name].push(order);
    });
    
    return groups;
  }

  private analyzeProductDemand(productName: string, orders: Order[]): ProductionRecommendation | null {
    if (orders.length === 0) return null;
    
    // Calculate total demand
    const totalDemand = orders.reduce((sum, o) => sum + o.tonnage_required, 0);
    
    // Current inventory
    const currentInventory = this.inventory
      .filter(inv => inv.product_name === productName)
      .reduce((sum, inv) => sum + inv.tonnage_available, 0);
    
    // Demand gap (what we need to produce)
    const demandGap = Math.max(0, totalDemand - currentInventory);
    
    // If no gap, no need to produce
    if (demandGap <= 0) return null;
    
    // Calculate transport capacity for this product
    const transportCapacity = this.calculateTransportCapacity(productName);
    
    // Calculate urgency score based on deadlines
    const urgencyScore = this.calculateUrgencyScore(orders);
    
    // Calculate average priority
    const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };
    const avgPriority = orders.reduce((sum, o) => sum + priorityValues[o.priority_level], 0) / orders.length;
    
    // Multi-factor priority score
    const priorityScore = (
      (demandGap / 1000) * 20 +           // Demand factor (20%)
      avgPriority * 25 +                   // Order priority (25%)
      urgencyScore * 30 +                  // Urgency (30%)
      (transportCapacity / 1000) * 15 +    // Transport availability (15%)
      (currentInventory < 500 ? 10 : 0)    // Low inventory bonus (10%)
    );
    
    return {
      product_name: productName,
      recommended_tonnage: Math.ceil(demandGap / 100) * 100, // Round to nearest 100
      priority_score: Math.min(100, Math.round(priorityScore)),
      reasoning: {
        demand_gap: Math.round(demandGap),
        pending_orders: orders.length,
        avg_order_priority: Math.round(avgPriority * 100) / 100,
        transport_capacity: Math.round(transportCapacity),
        current_inventory: Math.round(currentInventory),
        urgency_score: Math.round(urgencyScore),
      },
      based_on_orders: orders.length,
      transport_capacity_available: Math.round(transportCapacity),
      current_inventory: Math.round(currentInventory),
    };
  }

  private calculateTransportCapacity(productName: string): number {
    // Find suitable wagon types for this product
    const productConfig = BUSINESS_RULES.PRODUCTS[productName as keyof typeof BUSINESS_RULES.PRODUCTS];
    if (!productConfig) return 0;
    
    let totalCapacity = 0;
    
    productConfig.wagonTypes.forEach(wagonType => {
      const wagon = this.wagons.find(w => w.wagon_type === wagonType);
      if (wagon) {
        const wagonCapacity = BUSINESS_RULES.WAGON_TYPES[wagonType as keyof typeof BUSINESS_RULES.WAGON_TYPES]?.capacity || 60;
        // Assume 58 wagons per rake (ideal)
        totalCapacity += wagon.available_count * wagonCapacity;
      }
    });
    
    return totalCapacity;
  }

  private calculateUrgencyScore(orders: Order[]): number {
    const now = Date.now();
    let urgencyScore = 0;
    
    orders.forEach(order => {
      const deadline = new Date(order.deadline_date).getTime();
      const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntil < 0) {
        urgencyScore += 100; // Already overdue!
      } else if (daysUntil < 3) {
        urgencyScore += 80; // Critical urgency
      } else if (daysUntil < 7) {
        urgencyScore += 50; // High urgency
      } else if (daysUntil < 14) {
        urgencyScore += 25; // Medium urgency
      } else {
        urgencyScore += 10; // Low urgency
      }
    });
    
    return Math.min(100, urgencyScore / orders.length);
  }
}
