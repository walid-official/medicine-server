// modules/report/report.controller.ts
import { Router, Request, Response } from "express";
import { getDashboardReport } from "./report.service";

export const ReportRoutes = Router();

ReportRoutes.get("/summary", async (req: Request, res: Response) => {
  try {
    const { start, end, category, status, nearlyDays, groupBy } = req.query;

    const report = await getDashboardReport({
      start: start as string,
      end: end as string,
      category: category as string,
      status: status as any,
      nearlyDays: nearlyDays ? parseInt(nearlyDays as string, 10) : undefined,
      groupBy: (groupBy as any) || "month",
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err) || "Server error";
    res.status(500).json({ error: message });
  }
});
