
export function buildDateMatch(field: string, start?: string, end?: string) {
  const match: Record<string, any> = {};
  const range: Record<string, Date> = {};

  const isIsoWithTime = (s: string) => /T\d{2}:\d{2}/.test(s);

  const toUTCStartOfDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

  const nextUTCStartOfDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));

  if (start) {
    const s = new Date(start);
    range.$gte = isIsoWithTime(start) ? s : toUTCStartOfDay(s);
  }

  if (end) {
    const e = new Date(end);
    // EXCLUSIVE upper bound at the next day's start (UTC) if date only; otherwise +1ms
    range.$lt = isIsoWithTime(end) ? new Date(e.getTime() + 1) : nextUTCStartOfDay(e);
  }

  if (Object.keys(range).length) match[field] = range;
  return Object.keys(match).length ? match : null;
}
