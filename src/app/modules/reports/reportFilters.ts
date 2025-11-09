export function buildDateMatch(field: string, start?: string, end?: string) {
  const match: any = {};
  if (start || end) {
    match[field] = {};
    if (start) match[field].$gte = new Date(start);
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999); 
      match[field].$lte = endDate;
    }
  }
  return Object.keys(match).length ? match : null;
}