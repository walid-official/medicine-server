// helpers/reportFilters.ts
import { Types } from "mongoose";

export function buildDateMatch(field: string, start?: string, end?: string) {
  const match: any = {};
  if (start || end) {
    match[field] = {};
    if (start) match[field].$gte = new Date(start);
    if (end) match[field].$lte = new Date(end);
  }
  return Object.keys(match).length ? match : null;
}
