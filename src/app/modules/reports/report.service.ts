// report.service.ts
import { MedicineModel } from "../medicines/medicine.model";
import mongoose from "mongoose";
import { OrderModel } from "../order/order.model";

interface ReportFilters {
  start?: string;
  end?: string;
  category?: string;
  status?: "expired" | "nearly" | "in-stock" | "all";
  nearlyDays?: number;
  groupBy?: "month" | "week";
}

export const getDashboardReport = async (filters: ReportFilters = {}) => {
  const { start, end, category, status = "all", nearlyDays = 90, groupBy = "month" } = filters;

  const now = new Date();
  const nearlyDate = new Date(now);
  nearlyDate.setDate(now.getDate() + nearlyDays);

  // -------- Medicine Filters --------
  const medMatch: any = {};
  if (category) medMatch.category = category;
  if (status && status !== "all") {
    if (status === "expired") medMatch.expiryDate = { $lt: now };
    if (status === "nearly") medMatch.expiryDate = { $gte: now, $lte: nearlyDate };
    if (status === "in-stock") medMatch.quantity = { $gt: 0 };
  }

  // Total SKUs & Units always dynamic
  const medicineFacet: mongoose.PipelineStage[] = [
    { $match: medMatch },
    {
      $facet: {
        totalSKUs: [{ $count: "count" }],
        totalUnits: [{ $group: { _id: null, units: { $sum: "$quantity" } } }],
        expiredList: [{ $match: { expiryDate: { $lt: now } } }, { $count: "count" }],
        nearlyExpiryList: [{ $match: { expiryDate: { $gte: now, $lte: nearlyDate } } }, { $count: "count" }],
        byCategory: [
          { $group: { _id: "$category", skus: { $sum: 1 }, units: { $sum: "$quantity" } } },
          { $sort: { units: -1 } },
        ],
      },
    },
  ];

  // -------- Order Filters --------
  const orderMatch: any = {};
  if (start || end) orderMatch.createdAt = {};
  if (start) orderMatch.createdAt.$gte = new Date(start);
  if (end) {
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    orderMatch.createdAt.$lte = endDate;
  }
  if (!Object.keys(orderMatch).length) delete orderMatch.createdAt;

  const dateFormat = groupBy === "week" ? "%Y-%U" : "%Y-%m";

  const orderFacetPipeline: mongoose.PipelineStage[] = [
    { $match: orderMatch },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "medicines",
        localField: "items.medicineId",
        foreignField: "_id",
        as: "medDoc",
      },
    },
    { $unwind: "$medDoc" },
    ...(category ? [{ $match: { "medDoc.category": category } }] : []),

    // Group by order to get orderRevenue and discount
    {
      $group: {
        _id: "$_id",
        orderCreatedAt: { $first: "$createdAt" },
        discount: { $first: { $ifNull: ["$discount", 0] } },
        items: {
          $push: {
            medicineId: "$items.medicineId",
            name: "$items.name",
            qty: "$items.quantity",
            price: "$items.price",
            subtotal: "$items.subtotal",
            // ✅ CHANGED: কস্ট/কানা প্রাইস (per unit) Medicines থেকে নিয়ে আইটেমে রেখে দিচ্ছি
            costPrice: { $ifNull: ["$medDoc.price", 0] },
          },
        },
        orderRevenue: { $sum: "$items.subtotal" }, // sum before order-level discount
      },
    },

    // Unwind items for proportional discount & per-item profit
    { $unwind: "$items" },

    {
      $addFields: {
        // itemRevenue = আইটেম সাবটোটাল - (অর্ডার ডিসকাউন্টের প্রো-রাটা অংশ)
        itemRevenue: {
          $subtract: [
            "$items.subtotal",
            {
              $multiply: [
                "$items.subtotal",
                { $cond: [{ $eq: ["$orderRevenue", 0] }, 0, { $divide: ["$discount", "$orderRevenue"] }] },
              ],
            },
          ],
        },
        // ✅ CHANGED: itemCost = kana price (from medicines.price) * qty
        itemCost: {
          $multiply: [
            { $ifNull: ["$items.costPrice", 0] },
            { $ifNull: ["$items.qty", 0] },
          ],
        },
      },
    },

    {
      $facet: {
        totalRevenue: [
          { $group: { _id: null, revenue: { $sum: "$itemRevenue" } } },
        ],
        totalItemsSold: [
          { $group: { _id: null, itemsSold: { $sum: "$items.qty" } } },
        ],
        totalProfit: [
          {
            $group: {
              _id: null,
              // ✅ CHANGED: profit = revenue (after discount) − cost (kana price × qty)
              profit: { $sum: { $subtract: ["$itemRevenue", "$itemCost"] } },
            },
          },
        ],
        salesTrend: [
          {
            $group: {
              _id: { period: { $dateToString: { format: dateFormat, date: "$orderCreatedAt" } } },
              revenue: { $sum: "$itemRevenue" },
              itemsSold: { $sum: "$items.qty" },
            },
          },
          { $sort: { "_id.period": 1 } },
        ],
        medicinesSoldMonthly: [
          {
            $group: {
              _id: {
                med: "$items.medicineId",
                period: { $dateToString: { format: dateFormat, date: "$orderCreatedAt" } },
              },
              qty: { $sum: "$items.qty" },
            },
          },
          { $sort: { "_id.period": 1, qty: -1 } },
        ],
        topSelling: [
          {
            $group: {
              _id: "$items.medicineId",
              name: { $first: "$items.name" },
              qty: { $sum: "$items.qty" },
              revenue: { $sum: "$itemRevenue" },
            },
          },
          { $sort: { qty: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "medicines",
              localField: "_id",
              foreignField: "_id",
              as: "medDoc",
            },
          },
          { $unwind: { path: "$medDoc", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: { $ifNull: ["$medDoc.name", "$name"] },
              qty: 1,
              revenue: 1,
              category: "$medDoc.category",
            },
          },
        ],
      },
    },
  ];

  // Run pipelines
  const [medResultArr, orderResultArr] = await Promise.all([
    MedicineModel.aggregate(medicineFacet).allowDiskUse(true).exec(),
    OrderModel.aggregate(orderFacetPipeline).allowDiskUse(true).exec(),
  ]);

  const medResult = medResultArr[0] || {};
  const orderResult = orderResultArr[0] || {};

  const totalSKUs = medResult.totalSKUs?.[0]?.count || 0;
  const totalUnits = medResult.totalUnits?.[0]?.units || 0;
  const expiredCount = medResult.expiredList?.[0]?.count || 0;
  const nearlyCount = medResult.nearlyExpiryList?.[0]?.count || 0;
  const byCategory = medResult.byCategory || [];

  const totalRevenue = orderResult.totalRevenue?.[0]?.revenue || 0;
  const totalItemsSold = orderResult.totalItemsSold?.[0]?.itemsSold || 0;
  const totalProfit = orderResult.totalProfit?.[0]?.profit || 0;
  const salesTrend = orderResult.salesTrend || [];
  const medicinesSoldMonthly = orderResult.medicinesSoldMonthly || [];
  const topSelling = orderResult.topSelling || [];

  return {
    cards: {
      totalSKUs,
      totalUnits,
      expiredCount,
      nearlyExpiryCount: nearlyCount,
      totalRevenue,
      totalItemsSold,
      totalProfit,
    },
    byCategory,
    charts: {
      salesTrend,
      medicinesSoldMonthly,
      topSelling,
    },
  };
};
