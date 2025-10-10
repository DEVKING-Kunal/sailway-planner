// Enterprise-grade business rules and constraints

export const BUSINESS_RULES = {
  // Wagon specifications
  WAGON_TYPES: {
    BOXN: {
      capacity: 58.8, // tonnes
      suitableFor: ['Iron Ore', 'Coal', 'Limestone', 'Dolomite'],
      costPerKm: 2.5,
    },
    BCN: {
      capacity: 60.0,
      suitableFor: ['Coal', 'Iron Ore', 'Coke'],
      costPerKm: 2.3,
    },
    BCCN: {
      capacity: 62.0,
      suitableFor: ['Coal'],
      costPerKm: 2.4,
    },
    BOBR: {
      capacity: 55.0,
      suitableFor: ['Iron Ore', 'Limestone'],
      costPerKm: 2.6,
    },
  },

  // Rake specifications
  RAKE: {
    minWagons: 50,
    maxWagons: 59,
    idealWagons: 58,
    minUtilization: 0.75, // 75%
    targetUtilization: 0.90, // 90%
  },

  // Enhanced 8-component cost factors
  COSTS: {
    baseRakeCharge: 25000, // Base freight cost per rake
    perTonneRate: 450, // Per tonne transport cost
    distanceMultiplier: 1.5, // Cost increases with distance
    loadingCostPerTonne: 75, // Loading point operational cost
    demurragePerHour: 1500, // Detention charges if delayed
    idleFreightPerDay: 8000, // Cost of empty/idle wagons
    penaltyPerDayLate: 5000, // SLA breach penalty
    priorityPremium: {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.9,
    },
  },

  // SLA parameters
  SLA: {
    atRiskThresholdDays: 3, // Orders within 3 days are at-risk
    breachGracePeriodHours: 6, // Grace period after deadline
    criticalOrderBuffer: 1.2, // 20% time buffer for critical orders
  },

  // Multi-destination clubbing rules
  CLUBBING: {
    maxDestinationsPerRake: 3, // Maximum destinations in one rake
    minTonnagePerDestination: 300, // Minimum tonnage to justify destination stop
    routeDeviationThreshold: 150, // Max km deviation for clubbing (km)
  },

  // Optimization weights
  WEIGHTS: {
    priority: 0.4,
    utilization: 0.3,
    cost: 0.2,
    deadline: 0.1,
  },

  // Valid Indian cities (SAIL operational areas)
  VALID_CITIES: [
    'Bhilai',
    'Rourkela',
    'Durgapur',
    'Bokaro',
    'Burnpur',
    'Mumbai',
    'Kolkata',
    'Delhi',
    'Chennai',
    'Bangalore',
    'Hyderabad',
    'Pune',
    'Jamshedpur',
    'Ranchi',
    'Cuttack',
    'Visakhapatnam',
    'Nagpur',
    'Raipur',
    'Bilaspur',
    'Korba',
  ],

  // Product categories
  PRODUCTS: {
    'Iron Ore': { density: 2.5, wagonTypes: ['BOXN', 'BCN', 'BOBR'] },
    'Coal': { density: 1.4, wagonTypes: ['BCN', 'BCCN', 'BOXN'] },
    'Limestone': { density: 2.3, wagonTypes: ['BOXN', 'BOBR'] },
    'Dolomite': { density: 2.4, wagonTypes: ['BOXN'] },
    'Coke': { density: 1.0, wagonTypes: ['BCN'] },
    'Finished Steel': { density: 7.8, wagonTypes: ['BOXN'] },
  },
};

// Distance matrix (in km) - simplified for major routes
export const DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  'Bhilai': { 'Mumbai': 1150, 'Kolkata': 1200, 'Delhi': 1350, 'Chennai': 1450 },
  'Rourkela': { 'Mumbai': 1800, 'Kolkata': 450, 'Delhi': 1650, 'Chennai': 1900 },
  'Durgapur': { 'Mumbai': 1950, 'Kolkata': 180, 'Delhi': 1450, 'Chennai': 1850 },
  'Bokaro': { 'Mumbai': 1700, 'Kolkata': 400, 'Delhi': 1300, 'Chennai': 1800 },
};

export const getDistance = (origin: string, destination: string): number => {
  return DISTANCE_MATRIX[origin]?.[destination] || 800; // Default 800km
};
