import mongoose, { Schema, Document } from "mongoose";

export interface IMedicine extends Document {
  name: string;
  strength?: string;
  manufacturer?: string;
  category: string;
  batchNumber?: string;
  expiryDate: Date;
  mrp: number;
  price: number;
  quantity: number;
  costPrice?: number;
}

// Define manual categories
const medicineCategories = [
  "Pain Relief",
  "Antibiotic",
  "Vitamin & Supplement",
  "Cold & Flu",
  "Digestive Health",
  "Skin Care",
  "Cardiovascular",
  "Diabetes",
  "Respiratory",
  "Others",
];

const MedicineSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    strength: { type: String, required: false, trim: true },
    manufacturer: { type: String, required: false, trim: true },
    category: { type: String, required: true, enum: medicineCategories },
    batchNumber: { type: String, required: false, default: "", trim: true },
    expiryDate: { type: Date, required: true },
    mrp: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, required: false, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const MedicineModel = mongoose.model<IMedicine>("Medicine", MedicineSchema);
export { medicineCategories };
