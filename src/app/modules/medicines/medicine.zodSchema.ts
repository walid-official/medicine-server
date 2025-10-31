import { z } from "zod";
import { medicineCategories } from "./medicine.model";

// Create Medicine Schema
export const createMedicineSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.enum(medicineCategories).optional(), 
  batchNumber: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  mrp: z.number().nonnegative().optional(),
  price: z.number().nonnegative({ message: "Price must be positive" }),
  quantity: z.number().min(0, "Quantity must be at least 0"),
});


// Update Medicine Schema - all fields optional
export const updateMedicineSchema = createMedicineSchema.partial();