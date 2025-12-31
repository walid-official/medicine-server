// src/modules/orders/order.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem {
  medicineId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  user?: {
    name?: string;
    phone?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const OrderSchema = new Schema<IOrder>(
  {
    user: {
      name: { type: String, required: false },
      phone: { type: String, required: false }, 
    },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    invoiceUrl: { type: String },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);