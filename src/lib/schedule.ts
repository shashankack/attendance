import type { Holiday, WorkDay } from "./types";

export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

export function defaultWorkDays(): WorkDay[] {
  return weekdayOrder.map((weekday) => ({
    weekday,
    working: weekday >= 1 && weekday <= 6,
    startMinutes: 10 * 60,
    endMinutes: 18 * 60,
  }));
}

export function dateWeekday(date: string) {
  return new Date(`${date}T12:00:00+05:30`).getDay();
}

export function workDayFor(date: string, workDays: WorkDay[]) {
  return workDays.find((day) => day.weekday === dateWeekday(date)) ?? null;
}

export function holidayMonthDay(date: string) {
  return date.slice(5);
}

export function saturdayInMonth(date: string) {
  if (dateWeekday(date) !== 6) return null;
  return Math.ceil(Number(date.slice(8)) / 7);
}

export function isSecondOrFourthSaturday(date: string) {
  const ordinal = saturdayInMonth(date);
  return ordinal === 2 || ordinal === 4;
}

export function holidayOn(date: string, holidays: Holiday[]) {
  const monthDay = holidayMonthDay(date);
  return (
    holidays.find((holiday) => (holiday.yearly ? holidayMonthDay(holiday.date) === monthDay : holiday.date === date)) ?? null
  );
}

export function holidayCoversDate(holiday: Holiday, date: string) {
  return holiday.yearly ? holidayMonthDay(holiday.date) === holidayMonthDay(date) : holiday.date === date;
}

export function dayOffLabel(date: string, holidays: Holiday[], secondFourthSaturdayOff: boolean) {
  const holiday = holidayOn(date, holidays);
  if (holiday) return holiday.name;
  if (secondFourthSaturdayOff && isSecondOrFourthSaturday(date)) {
    const ordinal = saturdayInMonth(date);
    return ordinal === 2 ? "2nd Saturday" : "4th Saturday";
  }
  return null;
}

export function isExpected(date: string, workDays: WorkDay[], holidays: Holiday[], secondFourthSaturdayOff = false) {
  if (holidayOn(date, holidays)) return false;
  if (secondFourthSaturdayOff && isSecondOrFourthSaturday(date)) return false;
  return Boolean(workDayFor(date, workDays)?.working);
}

export function arrivalStatus(
  minutes: number,
  date: string,
  workDays: WorkDay[],
  holidays: Holiday[],
  secondFourthSaturdayOff = false,
) {
  if (!isExpected(date, workDays, holidays, secondFourthSaturdayOff)) return "PRESENT" as const;
  const start = workDayFor(date, workDays)?.startMinutes ?? 10 * 60;
  return minutes > start ? ("LATE" as const) : ("PRESENT" as const);
}

export function dayIsClosed(
  date: string,
  today: string,
  nowMinutes: number,
  workDays: WorkDay[],
  holidays: Holiday[],
  secondFourthSaturdayOff = false,
) {
  if (!isExpected(date, workDays, holidays, secondFourthSaturdayOff)) return false;
  if (date < today) return true;
  if (date > today) return false;
  const end = workDayFor(date, workDays)?.endMinutes ?? 18 * 60;
  return nowMinutes > end;
}

export function minutesToInput(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function inputToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function filledWorkDays(days: WorkDay[]) {
  const defaults = defaultWorkDays();
  return weekdayOrder.map((weekday) => days.find((day) => day.weekday === weekday) ?? defaults.find((day) => day.weekday === weekday)!);
}
