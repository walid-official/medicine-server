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
  nearlyDate.setDate(now.getDate() + (nearlyDays || 90));

  //  Medicine filter
  const medMatch: any = {};
  if (category) medMatch.category = category;
  if (status && status !== "all") {
    if (status === "expired") medMatch.expiryDate = { $lt: now };
    if (status === "nearly") medMatch.expiryDate = { $gte: now, $lte: nearlyDate };
    if (status === "in-stock") medMatch.quantity = { $gt: 0 };
  }
  if (start || end) {
    medMatch.createdAt = {};
    if (start) medMatch.createdAt.$gte = new Date(start);
    if (end) medMatch.createdAt.$lte = new Date(end);
    if (!Object.keys(medMatch.createdAt).length) delete medMatch.createdAt;
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

  //  Order filter
  const orderMatch: any = {};
  if (start || end) orderMatch.createdAt = {};
  if (start) orderMatch.createdAt.$gte = new Date(start);
  if (end) orderMatch.createdAt.$lte = new Date(end);
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

    {
      $project: {
        _id: 1,
        orderCreatedAt: "$createdAt",
        medicineId: "$items.medicineId",
        name: "$items.name",
        qty: "$items.quantity",
        salePrice: "$items.price", 
        itemSubtotal: "$items.subtotal",
        discount: { $ifNull: ["$discount", 0] }, 
        costPrice: "$medDoc.price", 
      },
    },

    {
      $facet: {
        // Total Revenue (discount per order)
        totalRevenue: [
          {
            $group: {
              _id: "$_id",
              orderRevenue: { $sum: "$itemSubtotal" },
              orderDiscount: { $first: "$discount" },
            },
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: { $subtract: ["$orderRevenue", "$orderDiscount"] } },
            },
          },
        ],

        // Total items sold
        totalItemsSold: [{ $group: { _id: null, itemsSold: { $sum: "$qty" } } }],

        // Profit calculation (Total sale - Total cost - Discount)
        totalProfit: [
          {
            $group: {
              _id: "$_id",
              totalSaleValue: { $sum: { $multiply: ["$salePrice", "$qty"] } },
              totalCostValue: { $sum: { $multiply: ["$costPrice", "$qty"] } },
              orderDiscount: { $first: "$discount" },
            },
          },
          {
            $group: {
              _id: null,
              profit: {
                $sum: {
                  $subtract: [
                    { $subtract: ["$totalSaleValue", "$totalCostValue"] },
                    "$orderDiscount",
                  ],
                },
              },
            },
          },
        ],

        //  Sales trend
        salesTrend: [
          {
            $group: {
              _id: { period: { $dateToString: { format: dateFormat, date: "$orderCreatedAt" } } },
              revenue: { $sum: "$itemSubtotal" },
              itemsSold: { $sum: "$qty" },
            },
          },
          { $sort: { "_id.period": 1 } },
        ],

        // Medicines sold monthly
        medicinesSoldMonthly: [
          {
            $group: {
              _id: {
                med: "$medicineId",
                period: { $dateToString: { format: dateFormat, date: "$orderCreatedAt" } },
              },
              qty: { $sum: "$qty" },
            },
          },
          { $sort: { "_id.period": 1, qty: -1 } },
        ],

        // Top-selling medicines
        topSelling: [
          {
            $group: {
              _id: "$medicineId",
              name: { $first: "$name" },
              qty: { $sum: "$qty" },
              revenue: { $sum: "$itemSubtotal" },
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

  // Run both pipelines
  const [medResultArr, orderResultArr] = await Promise.all([
    MedicineModel.aggregate(medicineFacet).allowDiskUse(true).exec(),
    OrderModel.aggregate(orderFacetPipeline).allowDiskUse(true).exec(),
  ]);

  // Extract data safely
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