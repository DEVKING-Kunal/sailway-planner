import { BUSINESS_RULES, getDistance } from './constants';

// Enterprise-grade Linear Programming Optimizer for Rake Planning

interface Order {
  id: string;
  product_name: string;
  tonnage_required: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  deadline_date: string;
  destination: string;
  customer_name: string;
}

interface InventoryItem {
  stockyard_name: string;
  product_name: string;
  tonnage_available: number;
}

interface Wagon {
  wagon_type: string;
  available_count: number;
  total_count: number;
}

interface LoadingPoint {
  point_name: string;
  capacity_tph: number;
  compatible_products: string[];
  operational_status: string;
}

interface OptimizationResult {
  rakePlans: RakePlan[];
  unfulfilledOrders: Order[];
  utilizationRate: number;
  totalCost: number;
}

interface CostBreakdown {
  base_freight: number;
  distance_cost: number;
  loading_cost: number;
  demurrage: number;
  penalty: number;
  idle_freight: number;
  priority_premium: number;
  total: number;
}

interface RakePlan {
  rakeId: string;
  orders: Order[];
  totalTonnage: number;
  wagonType: string;
  wagonCount: number;
  utilization: number;
  cost: number;
  costBreakdown: CostBreakdown;
  priorityScore: number;
  originStockyard: string;
  destinations: string[]; // Multi-destination support
  loadingPoint: string;
  estimatedDispatchTime: string;
  slaComplianceScore: number;
  multiDestination: boolean;
}

export class RakeOptimizer {
  private orders: Order[];
  private inventory: InventoryItem[];
  private wagons: Wagon[];
  private loadingPoints: LoadingPoint[];

  constructor(
    orders: Order[],
    inventory: InventoryItem[],
    wagons: Wagon[],
    loadingPoints: LoadingPoint[]
  ) {
    // Deep clone to avoid mutating original data
    this.orders = JSON.parse(JSON.stringify(orders));
    this.inventory = JSON.parse(JSON.stringify(inventory));
    this.wagons = JSON.parse(JSON.stringify(wagons));
    this.loadingPoints = JSON.parse(JSON.stringify(loadingPoints));
    
    // Validate inputs after cloning
    this.validateInputs();
  }

  private validateInputs(): void {
    // Validate orders
    if (!Array.isArray(this.orders) || this.orders.length === 0) {
      throw new Error('Orders array is required and must not be empty');
    }

    this.orders.forEach((order, idx) => {
      if (!order.tonnage_required || order.tonnage_required <= 0) {
        throw new Error(`Order ${idx}: Tonnage must be positive (got ${order.tonnage_required})`);
      }
      
      if (order.tonnage_required > 10000) {
        throw new Error(`Order ${idx}: Tonnage ${order.tonnage_required} exceeds limit of 10,000`);
      }

      if (!order.deadline_date) {
        throw new Error(`Order ${idx}: Missing deadline date`);
      }

      const deadline = new Date(order.deadline_date);
      if (isNaN(deadline.getTime())) {
        throw new Error(`Order ${idx}: Invalid deadline date`);
      }

      if (!['critical', 'high', 'medium', 'low'].includes(order.priority_level)) {
        throw new Error(`Order ${idx}: Invalid priority (${order.priority_level})`);
      }

      if (!BUSINESS_RULES.VALID_CITIES.includes(order.destination)) {
        throw new Error(`Order ${idx}: Invalid destination (${order.destination}). Must be one of: ${BUSINESS_RULES.VALID_CITIES.join(', ')}`);
      }
    });

    // Validate inventory
    if (!Array.isArray(this.inventory)) {
      throw new Error('Inventory array is required');
    }

    this.inventory.forEach((item, idx) => {
      if (item.tonnage_available < 0) {
        throw new Error(`Inventory ${idx}: Tonnage cannot be negative (got ${item.tonnage_available})`);
      }

      if (!BUSINESS_RULES.VALID_CITIES.includes(item.stockyard_name)) {
        throw new Error(`Inventory ${idx}: Invalid stockyard (${item.stockyard_name})`);
      }
    });

    // Validate wagons
    if (!Array.isArray(this.wagons) || this.wagons.length === 0) {
      throw new Error('Wagons array is required and must not be empty');
    }

    this.wagons.forEach((wagon, idx) => {
      if (wagon.available_count < 0) {
        throw new Error(`Wagon ${idx}: Available count cannot be negative (got ${wagon.available_count})`);
      }

      if (wagon.total_count < wagon.available_count) {
        throw new Error(`Wagon ${idx}: Total count (${wagon.total_count}) < available count (${wagon.available_count})`);
      }

      if (!BUSINESS_RULES.WAGON_TYPES[wagon.wagon_type]) {
        throw new Error(`Wagon ${idx}: Unknown wagon type (${wagon.wagon_type}). Must be one of: ${Object.keys(BUSINESS_RULES.WAGON_TYPES).join(', ')}`);
      }
    });

    // Validate loading points
    if (!Array.isArray(this.loadingPoints)) {
      throw new Error('Loading points array is required');
    }

    this.loadingPoints.forEach((lp, idx) => {
      if (!lp.capacity_tph || lp.capacity_tph <= 0) {
        throw new Error(`Loading point ${idx}: Capacity must be positive (got ${lp.capacity_tph})`);
      }

      if (!['active', 'inactive', 'maintenance'].includes(lp.operational_status)) {
        throw new Error(`Loading point ${idx}: Invalid status (${lp.operational_status})`);
      }
    });
  }

  /**
   * Main optimization algorithm using Linear Programming principles
   * Objective: Maximize (Priority × Utilization) - Cost
   * Constraints:
   * 1. Inventory availability
   * 2. Wagon availability
   * 3. Loading point capacity
   * 4. Rake capacity (min/max wagons)
   * 5. Product-wagon compatibility
   */
  optimize(): OptimizationResult {
    const rakePlans: RakePlan[] = [];
    const unfulfilledOrders: Order[] = [];
    
    // Step 1: Sort orders by composite priority score
    const sortedOrders = this.prioritizeOrders([...this.orders]);
    
    // Step 2: Group orders by product and destination for efficiency
    const orderGroups = this.groupOrders(sortedOrders);
    
    // Step 3: Create optimal rake plans for each group
    for (const group of orderGroups) {
      const plans = this.createRakePlansForGroup(group);
      rakePlans.push(...plans);
    }
    
    // Step 4: Handle remaining ungrouped orders
    const assignedOrderIds = new Set(
      rakePlans.flatMap(plan => plan.orders.map(o => o.id))
    );
    const remainingOrders = sortedOrders.filter(o => !assignedOrderIds.has(o.id));
    
    for (const order of remainingOrders) {
      const plan = this.createSingleOrderPlan(order);
      if (plan) {
        rakePlans.push(plan);
      } else {
        unfulfilledOrders.push(order);
      }
    }
    
    // Step 5: Calculate metrics
    const totalCost = rakePlans.reduce((sum, plan) => sum + plan.cost, 0);
    const totalCapacity = rakePlans.reduce((sum, plan) => 
      sum + (plan.wagonCount * this.getWagonCapacity(plan.wagonType)), 0
    );
    const totalUtilized = rakePlans.reduce((sum, plan) => sum + plan.totalTonnage, 0);
    const utilizationRate = totalCapacity > 0 ? totalUtilized / totalCapacity : 0;
    
    return {
      rakePlans,
      unfulfilledOrders,
      utilizationRate,
      totalCost,
    };
  }

  private prioritizeOrders(orders: Order[]): Order[] {
    const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return orders.sort((a, b) => {
      // Calculate composite score
      const scoreA = this.calculateOrderScore(a, priorityValues);
      const scoreB = this.calculateOrderScore(b, priorityValues);
      
      return scoreB - scoreA; // Higher score first
    });
  }

  private calculateOrderScore(order: Order, priorityValues: any): number {
    const priorityScore = priorityValues[order.priority_level] || 0;
    const deadlineScore = this.getDeadlineUrgency(order.deadline_date);
    const volumeScore = Math.min(order.tonnage_required / 1000, 5); // Normalize volume
    
    return (
      priorityScore * BUSINESS_RULES.WEIGHTS.priority +
      deadlineScore * BUSINESS_RULES.WEIGHTS.deadline +
      volumeScore * 0.1
    );
  }

  private getDeadlineUrgency(deadline: string): number {
    const daysUntil = Math.floor(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil <= 3) return 5;
    if (daysUntil <= 7) return 4;
    if (daysUntil <= 14) return 3;
    if (daysUntil <= 30) return 2;
    return 1;
  }

  private groupOrders(orders: Order[]): Order[][] {
    const groups: Map<string, Order[]> = new Map();
    
    for (const order of orders) {
      const key = `${order.product_name}-${order.destination}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(order);
    }
    
    // Return groups with sufficient volume for a rake
    return Array.from(groups.values()).filter(group => {
      const totalTonnage = group.reduce((sum, o) => sum + o.tonnage_required, 0);
      return totalTonnage >= 2000; // Minimum economic rake size
    });
  }

  private createRakePlansForGroup(orders: Order[]): RakePlan[] {
    const plans: RakePlan[] = [];
    if (orders.length === 0) return plans;
    
    const productName = orders[0].product_name;
    const destination = orders[0].destination;
    
    // Find suitable wagon type
    const wagonType = this.selectOptimalWagonType(productName);
    if (!wagonType) return plans;
    
    const wagonCapacity = this.getWagonCapacity(wagonType);
    let remainingOrders = [...orders];
    let rakeNumber = 1;
    
    while (remainingOrders.length > 0) {
      // Select orders for this rake using knapsack-like optimization
      const { selectedOrders, totalTonnage } = this.selectOrdersForRake(
        remainingOrders,
        wagonCapacity
      );
      
      if (selectedOrders.length === 0) break;
      
      // Find inventory and loading point
      const stockyard = this.findBestStockyard(productName, totalTonnage);
      const loadingPoint = this.findBestLoadingPoint(productName, stockyard);
      
      if (!stockyard || !loadingPoint) break;
      
      // Calculate wagon count
      const wagonCount = Math.min(
        Math.ceil(totalTonnage / wagonCapacity),
        BUSINESS_RULES.RAKE.maxWagons
      );
      
      if (wagonCount < BUSINESS_RULES.RAKE.minWagons) break;
      
      // Check wagon availability
      if (!this.checkWagonAvailability(wagonType, wagonCount)) break;
      
      const utilization = totalTonnage / (wagonCount * wagonCapacity);
      
      // Only create plan if utilization meets minimum threshold
      if (utilization >= BUSINESS_RULES.RAKE.minUtilization) {
        const plan = this.buildRakePlan({
          rakeNumber: rakeNumber++,
          orders: selectedOrders,
          totalTonnage,
          wagonType,
          wagonCount,
          utilization,
          stockyard,
          destination,
          loadingPoint,
          productName,
        });
        
        plans.push(plan);
        
        // Update availability
        this.consumeInventory(stockyard, productName, totalTonnage);
        this.consumeWagons(wagonType, wagonCount);
        
        // Remove assigned orders
        remainingOrders = remainingOrders.filter(
          o => !selectedOrders.find(so => so.id === o.id)
        );
      } else {
        break;
      }
    }
    
    return plans;
  }

  private selectOrdersForRake(
    orders: Order[],
    wagonCapacity: number
  ): { selectedOrders: Order[]; totalTonnage: number } {
    // Knapsack algorithm: maximize value (priority) within capacity constraint
    const maxCapacity = BUSINESS_RULES.RAKE.maxWagons * wagonCapacity;
    const targetCapacity = BUSINESS_RULES.RAKE.idealWagons * wagonCapacity * 0.9;
    
    const selected: Order[] = [];
    let totalTonnage = 0;
    
    for (const order of orders) {
      if (totalTonnage + order.tonnage_required <= maxCapacity) {
        selected.push(order);
        totalTonnage += order.tonnage_required;
        
        // Stop if we reach target capacity
        if (totalTonnage >= targetCapacity) break;
      }
    }
    
    return { selectedOrders: selected, totalTonnage };
  }

  private selectOptimalWagonType(productName: string): string | null {
    const productConfig = BUSINESS_RULES.PRODUCTS[productName as keyof typeof BUSINESS_RULES.PRODUCTS];
    if (!productConfig) {
      console.warn(`Product ${productName} not found in BUSINESS_RULES.PRODUCTS`);
      return null;
    }
    
    // Find available wagon type with best cost-capacity ratio
    for (const wagonType of productConfig.wagonTypes) {
      const wagon = this.wagons.find(w => w.wagon_type === wagonType && w.available_count >= BUSINESS_RULES.RAKE.minWagons);
      if (wagon) return wagonType;
    }
    
    console.warn(`No available wagons for product ${productName}. Required: ${BUSINESS_RULES.RAKE.minWagons} wagons`);
    return null;
  }

  private getWagonCapacity(wagonType: string): number {
    const capacity = BUSINESS_RULES.WAGON_TYPES[wagonType as keyof typeof BUSINESS_RULES.WAGON_TYPES]?.capacity;
    if (!capacity) {
      console.warn(`Wagon type ${wagonType} not found, using default capacity 60`);
      return 60;
    }
    return capacity;
  }

  private findBestStockyard(productName: string, tonnageNeeded: number): string | null {
    const suitable = this.inventory.filter(
      inv => inv.product_name === productName && inv.tonnage_available >= tonnageNeeded
    );
    
    if (suitable.length === 0) {
      console.warn(`No inventory available for ${productName} with ${tonnageNeeded} tonnes needed`);
      return null;
    }
    
    // Return stockyard with highest availability (less fragmentation)
    return suitable.sort((a, b) => b.tonnage_available - a.tonnage_available)[0].stockyard_name;
  }

  private findBestLoadingPoint(productName: string, stockyard: string | null): string | null {
    if (!stockyard) return null;
    
    const suitable = this.loadingPoints.filter(
      lp => lp.operational_status === 'active' && 
            lp.compatible_products.includes(productName)
    );
    
    if (suitable.length === 0) {
      console.warn(`No active loading points for product ${productName}`);
      return null;
    }
    
    // Return loading point with highest capacity
    return suitable.sort((a, b) => b.capacity_tph - a.capacity_tph)[0].point_name;
  }

  private checkWagonAvailability(wagonType: string, count: number): boolean {
    const wagon = this.wagons.find(w => w.wagon_type === wagonType);
    return wagon ? wagon.available_count >= count : false;
  }

  private consumeInventory(stockyard: string, product: string, tonnage: number): void {
    const inv = this.inventory.find(
      i => i.stockyard_name === stockyard && i.product_name === product
    );
    if (inv) {
      inv.tonnage_available -= tonnage;
    }
  }

  private consumeWagons(wagonType: string, count: number): void {
    const wagon = this.wagons.find(w => w.wagon_type === wagonType);
    if (wagon) {
      wagon.available_count -= count;
    }
  }

  private buildRakePlan(params: any): RakePlan {
    const {
      rakeNumber,
      orders,
      totalTonnage,
      wagonType,
      wagonCount,
      utilization,
      stockyard,
      destination,
      loadingPoint,
      productName,
    } = params;
    
    // Support multi-destination
    const destinations = Array.isArray(destination) ? destination : [destination];
    const isMultiDest = destinations.length > 1;
    
    // Calculate enhanced 8-component cost breakdown
    const distance = isMultiDest 
      ? destinations.reduce((sum, dest) => sum + getDistance(stockyard, dest), 0) / destinations.length
      : getDistance(stockyard, destinations[0]);
    
    const wagonTypeConfig = BUSINESS_RULES.WAGON_TYPES[wagonType as keyof typeof BUSINESS_RULES.WAGON_TYPES];
    const wagonCostPerKm = wagonTypeConfig?.costPerKm || 2.5;
    
    // Validate cost calculation inputs
    if (wagonCount <= 0) throw new Error('Wagon count must be positive');
    if (distance < 0) throw new Error('Distance cannot be negative');
    if (totalTonnage <= 0) throw new Error('Total tonnage must be positive');

    // 8-Component Cost Model
    const baseFreight = BUSINESS_RULES.COSTS.baseRakeCharge;
    const distanceCost = wagonCount * wagonCostPerKm * distance * BUSINESS_RULES.COSTS.distanceMultiplier;
    const loadingCost = totalTonnage * BUSINESS_RULES.COSTS.loadingCostPerTonne;
    
    // Demurrage: estimated based on loading time
    const loadingHours = Math.ceil((totalTonnage / 1000) * 2);
    if (!isFinite(loadingHours) || loadingHours < 0) {
      throw new Error('Invalid loading hours calculation');
    }
    const demurrage = loadingHours > 24 ? (loadingHours - 24) * BUSINESS_RULES.COSTS.demurragePerHour : 0;
    
    // Penalty: check if any orders are at risk or breached
    let penalty = 0;
    const now = Date.now();
    orders.forEach((o: Order) => {
      const deadline = new Date(o.deadline_date).getTime();
      const daysLate = Math.max(0, Math.ceil((now - deadline) / (1000 * 60 * 60 * 24)));
      if (daysLate > 0) penalty += daysLate * BUSINESS_RULES.COSTS.penaltyPerDayLate;
    });
    
    // Idle freight: if utilization is low
    const idleFreight = utilization < 0.75 ? BUSINESS_RULES.COSTS.idleFreightPerDay * (1 - utilization) : 0;
    
    // Priority premium
    const avgPriority = orders.reduce((sum: number, o: Order) => {
      const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };
      return sum + priorityValues[o.priority_level];
    }, 0) / orders.length;
    const priorityLevel = avgPriority >= 3.5 ? 'critical' : avgPriority >= 2.5 ? 'high' : avgPriority >= 1.5 ? 'medium' : 'low';
    const priorityPremium = (baseFreight + distanceCost) * (BUSINESS_RULES.COSTS.priorityPremium[priorityLevel as keyof typeof BUSINESS_RULES.COSTS.priorityPremium] - 1);
    
    const totalCost = baseFreight + distanceCost + loadingCost + demurrage + penalty + idleFreight + priorityPremium;
    
    const costBreakdown: CostBreakdown = {
      base_freight: Math.round(baseFreight),
      distance_cost: Math.round(distanceCost),
      loading_cost: Math.round(loadingCost),
      demurrage: Math.round(demurrage),
      penalty: Math.round(penalty),
      idle_freight: Math.round(idleFreight),
      priority_premium: Math.round(priorityPremium),
      total: Math.round(totalCost),
    };
    
    // Calculate composite priority score
    const priorityScore = (
      avgPriority * BUSINESS_RULES.WEIGHTS.priority +
      utilization * BUSINESS_RULES.WEIGHTS.utilization -
      (totalCost / 100000) * BUSINESS_RULES.WEIGHTS.cost
    );
    
    // SLA compliance score
    const slaComplianceScore = this.calculateSLACompliance(orders);
    
    // Estimate dispatch time (2 hours loading per 1000 tonnes)
    const estimatedDispatchTime = new Date(Date.now() + loadingHours * 60 * 60 * 1000).toISOString();
    
    return {
      rakeId: `RAKE-${new Date().getFullYear()}-${String(rakeNumber).padStart(4, '0')}`,
      orders,
      totalTonnage,
      wagonType,
      wagonCount,
      utilization: Math.round(utilization * 100) / 100,
      cost: Math.round(totalCost),
      costBreakdown,
      priorityScore: Math.round(priorityScore * 100) / 100,
      originStockyard: stockyard,
      destinations,
      loadingPoint,
      estimatedDispatchTime,
      slaComplianceScore,
      multiDestination: isMultiDest,
    };
  }

  private calculateSLACompliance(orders: Order[]): number {
    const now = Date.now();
    let complianceScore = 100;
    
    orders.forEach(order => {
      const deadline = new Date(order.deadline_date).getTime();
      const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntil < 0) {
        complianceScore -= 30; // Breached
      } else if (daysUntil < BUSINESS_RULES.SLA.atRiskThresholdDays) {
        complianceScore -= 10; // At risk
      }
    });
    
    return Math.max(0, complianceScore);
  }

  private createSingleOrderPlan(order: Order): RakePlan | null {
    // Try to create a plan for a single order if economically viable
    if (order.tonnage_required < 2000) return null; // Too small for dedicated rake
    
    const wagonType = this.selectOptimalWagonType(order.product_name);
    if (!wagonType) return null;
    
    const stockyard = this.findBestStockyard(order.product_name, order.tonnage_required);
    const loadingPoint = this.findBestLoadingPoint(order.product_name, stockyard);
    
    if (!stockyard || !loadingPoint) return null;
    
    const wagonCapacity = this.getWagonCapacity(wagonType);
    const wagonCount = Math.min(
      Math.ceil(order.tonnage_required / wagonCapacity),
      BUSINESS_RULES.RAKE.maxWagons
    );
    
    if (wagonCount < BUSINESS_RULES.RAKE.minWagons || 
        !this.checkWagonAvailability(wagonType, wagonCount)) {
      return null;
    }
    
    const utilization = order.tonnage_required / (wagonCount * wagonCapacity);
    
    if (utilization < BUSINESS_RULES.RAKE.minUtilization) return null;
    
    this.consumeInventory(stockyard, order.product_name, order.tonnage_required);
    this.consumeWagons(wagonType, wagonCount);
    
    return this.buildRakePlan({
      rakeNumber: Date.now(),
      orders: [order],
      totalTonnage: order.tonnage_required,
      wagonType,
      wagonCount,
      utilization,
      stockyard,
      destination: order.destination,
      loadingPoint,
      productName: order.product_name,
    });
  }
}
