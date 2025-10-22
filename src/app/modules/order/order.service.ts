import { IMedicine, MedicineModel } from "../medicines/medicine.model";
import { OrderModel } from "./order.model";

interface CreateOrderInput {
  user: {
    name: string;
    phone?: string;
  };
  items: { medicineId: string; quantity: number }[];
  discount?: number;
}

export const createOrder = async (input: CreateOrderInput) => {
  const { user, items, discount } = input;

  if (!items || items.length === 0) throw new Error("Cart is empty");

  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const medicine: IMedicine | null = await MedicineModel.findById(item.medicineId);
    if (!medicine) throw new Error(`Medicine not found`);

    if (medicine.quantity < item.quantity)
      throw new Error(`Not enough stock for ${medicine.name}`);

    // sold price = medicine.mrp
    const soldPrice = medicine.mrp;
    const itemSubtotal = soldPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      medicineId: medicine._id,
      name: medicine.name,
      quantity: item.quantity,
      price: soldPrice,
      subtotal: parseFloat(itemSubtotal.toFixed(2)),
    });

    // reduce stock
    medicine.quantity -= item.quantity;
    await medicine.save();
  }

  const grandTotal = subtotal - (discount || 0);

  const order = new OrderModel({
    user,
    items: orderItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat((discount || 0).toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  });

  await order.save();

  return order;
};
