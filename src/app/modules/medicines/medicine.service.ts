import { IMedicine, MedicineModel } from "./medicine.model";

interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const createMedicine = async (data: Partial<IMedicine>) => {
  const medicine = new MedicineModel(data);
  return medicine.save();
};

export const createManyMedicines = async (data: Partial<IMedicine>[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No medicine data provided");
  }
  return MedicineModel.insertMany(data);
};


// Service
export const getMedicines = async (
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { batchNumber: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const medicines = await MedicineModel.find(query)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await MedicineModel.countDocuments(query);

  return { medicines, total, page, limit };
};


export const getMedicineById = async (id: string) => {
  return MedicineModel.findById(id);
};

export const updateMedicine = async (id: string, data: Partial<IMedicine>) => {
  return MedicineModel.findByIdAndUpdate(id, data, { new: true });
};

export const deleteMedicine = async (id: string) => {
  return MedicineModel.findByIdAndDelete(id);
};


export const updateMedicineMRP = async (id: string, newMRP: number) => {
  return MedicineModel.findByIdAndUpdate(
    id,
    { $set: { mrp: newMRP } },
    { new: true }
  );
};


export const getExpiredMedicines = async (status: "expired" | "nearly" | "all" = "expired", nearlyDays: number = 30) => {
  const now = new Date();
  let query = {};

  if (status === "expired") {
    // Already expired
    query = { expiryDate: { $lt: now } };
  } else if (status === "nearly") {
    // Expiring soon (within N days)
    const upcoming = new Date();
    upcoming.setDate(now.getDate() + nearlyDays);
    query = { expiryDate: { $gte: now, $lte: upcoming } };
  } else if (status === "all") {
    // Both expired and nearly expired
    const upcoming = new Date();
    upcoming.setDate(now.getDate() + nearlyDays);
    query = { expiryDate: { $lte: upcoming } };
  }

  const medicines = await MedicineModel.find(query).sort({ expiryDate: 1 });

  return { total: medicines.length, medicines };
};
