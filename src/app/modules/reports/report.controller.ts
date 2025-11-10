// modules/report/report.controller.ts
import { Router, Request, Response } from "express";
import { getDashboardReport } from "./report.service";

export const ReportRoutes = Router();

ReportRoutes.get("/summary", async (req: Request, res: Response) => {
  try {
    const { start, end, category, status, nearlyDays, groupBy } = req.query;

    const report = await getDashboardReport({
      start: typeof start === "string" ? start.trim() : undefined,
      end: typeof end === "string" ? end.trim() : undefined,
      category: typeof category === "string" ? category.trim() : undefined,
      status: (status as any) || "all",
      nearlyDays:
        typeof nearlyDays === "string"
          ? parseInt(nearlyDays as string, 10)
          : undefined,
      groupBy: (groupBy as any) || "month",
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : String(err) || "Server error";
    res.status(500).json({ error: message });
  }
});