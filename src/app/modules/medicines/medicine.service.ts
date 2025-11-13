import { IMedicine, MedicineModel } from "./medicine.model";

interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const createMedicine = async (data: Partial<IMedicine>) => {
  try {
    const result = await MedicineModel.create(data);
    return result;
  } catch (err) {
    console.error("Medicine create failed:", err);
    throw err;
  }
};

export const createManyMedicines = async (data: Partial<IMedicine>[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No medicine data provided");
  }
  return MedicineModel.insertMany(data);
};


// Service
export const getMedicines = async (search?: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  // Use indexed text search
  const query = search
    ? { $text: { $search: search } }
    : {};

  //  One DB call using aggregate + facet
  const [result] = await MedicineModel.aggregate([
    { $match: query },
    {
      $facet: {
        medicines: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              name: 1,
              category: 1,
              price: 1,
              expiryDate: 1,
              mrp: 1,
              quantity: 1,
              batchNumber: 1,
              manufacturer: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const medicines = result.medicines || [];
  const total = result.total[0]?.count || 0;

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
