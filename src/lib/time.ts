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

export function greeting(timeZone: string, instant = new Date()) {
  const minutes = officeMinutes(timeZone, instant);
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}
