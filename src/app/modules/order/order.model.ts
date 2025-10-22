import mongoose, { Schema, Document, Types } from "mongoose";

interface IOrderItem {
  medicineId: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface IOrder extends Document {
  user: {
    name: string;
    phone?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  discount?: number;
  grandTotal: number;
  createdAt: Date;
}

const OrderSchema: Schema = new Schema({
  user: {
    name: { type: String, required: true },
    phone: { type: String },
  },
  items: [
    {
      medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      subtotal: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);