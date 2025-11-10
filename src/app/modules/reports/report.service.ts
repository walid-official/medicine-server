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

  // ------------------ Medicine Filters ------------------
  const medMatch: any = {};
  if (category) medMatch.category = category;
  if (status && status !== "all") {
    if (status === "expired") medMatch.expiryDate = { $lt: now };
    if (status === "nearly") medMatch.expiryDate = { $gte: now, $lte: nearlyDate };
    if (status === "in-stock") medMatch.quantity = { $gt: 0 };
  }

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

  // ------------------ Order Filters ------------------
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

  // ------------------ Order Facet Pipeline ------------------
  const orderFacetPipeline: mongoose.PipelineStage[] = [
    { $match: orderMatch },
    {
      $facet: {
        totalRevenue: [
          { $group: { _id: null, revenue: { $sum: "$grandTotal" } } },
        ],
        totalOrders: [
          { $group: { _id: null, count: { $sum: 1 } } },
        ],

        // 🟢 Total Kana Price (from medicineId lookup)
        totalKanaPrice: [
          { $unwind: "$items" },
          {
            $lookup: {
              from: "medicines",
              localField: "items.medicineId",
              foreignField: "_id",
              as: "medicineInfo",
            },
          },
          { $unwind: "$medicineInfo" },
          {
            $group: {
              _id: null,
              totalKana: {
                $sum: {
                  $multiply: ["$items.quantity", "$medicineInfo.price"],
                },
              },
            },
          },
        ],

        // 🟢 Total Units Sold (sum of all sold quantities)
        totalUnitsSold: [
          { $unwind: "$items" },
          {
            $group: {
              _id: null,
              totalUnitsSold: { $sum: "$items.quantity" },
            },
          },
        ],

        // 🟢 Top Selling Products (multiple)
        topSellingProducts: [
          { $unwind: "$items" },
          {
            $lookup: {
              from: "medicines",
              localField: "items.medicineId",
              foreignField: "_id",
              as: "medicineInfo",
            },
          },
          { $unwind: "$medicineInfo" },
          {
            $group: {
              _id: "$items.medicineId",
              name: { $first: "$medicineInfo.name" },
              category: { $first: "$medicineInfo.category" },
              totalSoldUnits: { $sum: "$items.quantity" },
            },
          },
          { $sort: { totalSoldUnits: -1 } },
          { $limit: 5 }, // top 5 best-selling
        ],

        salesTrend: [
          {
            $group: {
              _id: { period: { $dateToString: { format: dateFormat, date: "$createdAt" } } },
              revenue: { $sum: "$grandTotal" },
            },
          },
          { $sort: { "_id.period": 1 } },
        ],
        topCustomers: [
          {
            $group: {
              _id: "$user.name",
              phone: { $first: "$user.phone" },
              totalSpent: { $sum: "$grandTotal" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ];

  // ------------------ Execute Aggregations ------------------
  const [medResultArr, orderResultArr] = await Promise.all([
    MedicineModel.aggregate(medicineFacet).allowDiskUse(true).exec(),
    OrderModel.aggregate(orderFacetPipeline).allowDiskUse(true).exec(),
  ]);

  const medResult = medResultArr[0] || {};
  const orderResult = orderResultArr[0] || {};

  // ------------------ Medicine Data ------------------
  const totalSKUs = medResult.totalSKUs?.[0]?.count || 0;
  const totalUnits = medResult.totalUnits?.[0]?.units || 0;
  const expiredCount = medResult.expiredList?.[0]?.count || 0;
  const nearlyCount = medResult.nearlyExpiryList?.[0]?.count || 0;
  const byCategory = medResult.byCategory || [];

  // ------------------ Order Data ------------------
  const totalRevenue = orderResult.totalRevenue?.[0]?.revenue || 0;
  const totalOrders = orderResult.totalOrders?.[0]?.count || 0;
  const totalKanaPrice = orderResult.totalKanaPrice?.[0]?.totalKana || 0;
  const totalProfit = totalRevenue - totalKanaPrice;
  const totalUnitsSold = orderResult.totalUnitsSold?.[0]?.totalUnitsSold || 0;
  const topSelling = orderResult.topSellingProducts || [];
  const salesTrend = orderResult.salesTrend || [];
  const topCustomers = orderResult.topCustomers || [];

  // ------------------ Final Return ------------------
  return {
    cards: {
      totalSKUs,
      totalUnits,
      expiredCount,
      nearlyExpiryCount: nearlyCount,
      totalRevenue,
      totalOrders,
      totalKanaPrice,
      totalProfit,
      totalUnitsSold,
    },
    byCategory,
    charts: {
      salesTrend,
      topCustomers,
      topSelling, 
    },
  };
};
