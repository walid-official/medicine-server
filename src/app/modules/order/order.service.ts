import { IMedicine, MedicineModel } from "../medicines/medicine.model";
import { OrderModel } from "./order.model";


interface CreateOrderInput {
  user: {
    name: string;
    email: string;
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

    const itemSubtotal = medicine.price * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      medicineId: medicine._id,
      name: medicine.name,
      quantity: item.quantity,
      price: medicine.price,
      subtotal: itemSubtotal,
    });

    // reduce stock
    medicine.quantity -= item.quantity;
    await medicine.save();
  }

  const grandTotal = subtotal - (discount || 0);

  const order = new OrderModel({
    user,
    items: orderItems,
    subtotal,
    discount: discount || 0,
    grandTotal,
  });

  await order.save();

  return order;
};
