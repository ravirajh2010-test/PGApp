/**
 * Calendar-based rent for PG tenants (India-style monthly billing).
 * - Full monthly rent when the tenant occupies every day of the billing month
 *   (joined on/before the 1st, and no checkout before the last day).
 * - Vacating month (checkout before the last calendar day): prorate by days stayed / days in month.
 * - Mid-month join: prorate from join date through end of stay (inclusive).
 *
 * Dates from PostgreSQL are parsed as calendar dates (no UTC shift surprises).
 */
function parseTenantDate(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value).split('T')[0];
  const parts = s.split('-').map((x) => parseInt(x, 10));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * @param {number} monthIndex 0-based (0 = January)
 * @param {number} year full year
 * @param {Date} startDate tenant start (calendar)
 * @param {Date|null} endDate tenant checkout (calendar) or null
 * @param {number} monthlyRent configured monthly rent
 */
function calculateProratedRent(monthIndex, year, startDate, endDate, monthlyRent) {
  const start = parseTenantDate(startDate);
  const end = endDate ? parseTenantDate(endDate) : null;
  if (!start) return 0;

  const rent = Number(monthlyRent);
  if (!Number.isFinite(rent) || rent <= 0) return 0;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const daysInMonth = monthEnd.getDate();

  if (start > monthEnd) return 0;
  if (end && end < monthStart) return 0;

  if (start <= monthStart) {
    if (end && end >= monthStart && end < monthEnd) {
      const daysCharged = end.getDate();
      return Math.round((daysCharged / daysInMonth) * rent);
    }
    return rent;
  }

  const joinDay = start.getDate();
  const lastDay = end && end < monthEnd ? end.getDate() : daysInMonth;
  const daysCharged = lastDay - joinDay + 1;

  if (daysCharged <= 0) {
    if (!end || end >= start) {
      return Math.round((1 / daysInMonth) * rent);
    }
    return 0;
  }

  return Math.round((daysCharged / daysInMonth) * rent);
}

module.exports = { parseTenantDate, calculateProratedRent };
