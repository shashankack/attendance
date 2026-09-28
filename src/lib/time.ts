export function officeDate(timeZone: string, instant = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function officeMinutes(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function formatClock(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatOfficeDay(date: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

export function formatLongDay(timeZone: string, instant = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instant);
}

export function currentMonth(timeZone: string, instant = new Date()) {
  return officeDate(timeZone, instant).slice(0, 7);
}

export function parseMonth(value: string | undefined, timeZone: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const month = Number(value.slice(5, 7));
    if (month >= 1 && month <= 12) return value;
  }
  return currentMonth(timeZone);
}

export function shiftMonth(month: string, delta: number) {
  const year = Number(month.slice(0, 4));
  const mon = Number(month.slice(5, 7));
  const date = new Date(year, mon - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function daysOfMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const mon = Number(month.slice(5, 7));
  const count = new Date(year, mon, 0).getDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

export function isWeekend(date: string) {
  const day = new Date(`${date}T12:00:00+05:30`).getDay();
  return day === 0 || day === 6;
}

export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${month}-01T12:00:00+05:30`));
}

export function greeting(timeZone: string, instant = new Date()) {
  const minutes = officeMinutes(timeZone, instant);
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}
