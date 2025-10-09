import { z } from 'zod';
import { BUSINESS_RULES } from './constants';

// Comprehensive validation schemas for enterprise-grade data integrity

// Authentication validation schemas
export const authValidation = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
});

export const authSignInValidation = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .toLowerCase(),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
});

export const orderValidation = z.object({
  order_number: z.string()
    .min(3, "Order number must be at least 3 characters")
    .max(50, "Order number too long")
    .regex(/^ORD-[A-Z0-9-]+$/, "Order number must follow format: ORD-XXXXX"),
  
  customer_id: z.string()
    .min(3, "Customer ID must be at least 3 characters")
    .max(50, "Customer ID too long")
    .regex(/^CUST-[A-Z0-9]+$/, "Customer ID must follow format: CUST-XXXXX"),
  
  customer_name: z.string()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name too long")
    .regex(/^[A-Za-z\s&.()]+$/, "Customer name can only contain letters, spaces, and basic punctuation"),
  
  destination: z.string()
    .min(2, "Destination required")
    .refine(
      (city) => BUSINESS_RULES.VALID_CITIES.some(c => c.toLowerCase() === city.toLowerCase()),
      { message: `Destination must be a valid SAIL operational city: ${BUSINESS_RULES.VALID_CITIES.join(', ')}` }
    ),
  
  product_id: z.string()
    .min(3, "Product ID must be at least 3 characters")
    .max(50, "Product ID too long")
    .regex(/^PROD-[A-Z0-9]+$/, "Product ID must follow format: PROD-XXXXX"),
  
  product_name: z.string()
    .refine(
      (product) => Object.keys(BUSINESS_RULES.PRODUCTS).includes(product),
      { message: `Product must be one of: ${Object.keys(BUSINESS_RULES.PRODUCTS).join(', ')}` }
    ),
  
  tonnage_required: z.string()
    .refine(
      val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 10000,
      "Tonnage must be between 1 and 10,000 tonnes"
    )
    .refine(
      val => parseFloat(val) >= 100,
      "Minimum order quantity is 100 tonnes for railway logistics"
    ),
  
  deadline_date: z.string()
    .refine(
      date => {
        const deadlineDate = new Date(date);
        const today = new Date();
        const minDate = new Date(today.setDate(today.getDate() + 3)); // Minimum 3 days lead time
        return deadlineDate > minDate;
      },
      "Deadline must be at least 3 days from today for planning and logistics"
    ),
  
  priority_level: z.enum(["critical", "high", "medium", "low"]),
});

export const inventoryValidation = z.object({
  product_id: z.string().regex(/^PROD-[A-Z0-9]+$/),
  product_name: z.string().refine(
    (product) => Object.keys(BUSINESS_RULES.PRODUCTS).includes(product),
    "Invalid product name"
  ),
  stockyard_id: z.string().regex(/^SY-[A-Z0-9]+$/),
  stockyard_name: z.string().refine(
    (city) => BUSINESS_RULES.VALID_CITIES.includes(city),
    "Invalid stockyard location"
  ),
  tonnage_available: z.number()
    .positive("Tonnage must be positive")
    .max(50000, "Maximum stockyard capacity is 50,000 tonnes"),
});

export const wagonValidation = z.object({
  wagon_type: z.string().refine(
    (type) => Object.keys(BUSINESS_RULES.WAGON_TYPES).includes(type),
    `Wagon type must be one of: ${Object.keys(BUSINESS_RULES.WAGON_TYPES).join(', ')}`
  ),
  available_count: z.number()
    .int()
    .min(0, "Available count cannot be negative")
    .max(1000, "Maximum wagon count is 1000"),
  total_count: z.number()
    .int()
    .positive("Total count must be positive"),
});

export const loadingPointValidation = z.object({
  point_id: z.string().regex(/^LP-[A-Z0-9]+$/),
  point_name: z.string().min(3).max(100),
  capacity_tph: z.number()
    .positive("Capacity must be positive")
    .min(500, "Minimum loading capacity is 500 TPH")
    .max(10000, "Maximum loading capacity is 10,000 TPH"),
  compatible_products: z.array(z.string()).min(1, "At least one compatible product required"),
  operational_status: z.enum(["active", "inactive", "maintenance"]),
});

// Validation helper functions
export const validateOrder = (data: any) => {
  return orderValidation.safeParse(data);
};

export const validateInventory = (data: any) => {
  return inventoryValidation.safeParse(data);
};

export const validateWagon = (data: any) => {
  return wagonValidation.safeParse(data);
};

export const validateLoadingPoint = (data: any) => {
  return loadingPointValidation.safeParse(data);
};

export const validateAuthSignUp = (data: any) => {
  return authValidation.safeParse(data);
};

export const validateAuthSignIn = (data: any) => {
  return authSignInValidation.safeParse(data);
};
