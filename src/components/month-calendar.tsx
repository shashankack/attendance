import { dayOffLabel, isExpected } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { daysOfMonth, formatClock } from "@/lib/time";
import type { Attendance, Holiday, WorkDay } from "@/lib/types";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOffset(date: string) {
  const day = new Date(`${date}T12:00:00+05:30`).getDay();
  return (day + 6) % 7;
}

export function MonthCalendar({
  month,
  today,
  timeZone,
  records,
  workDays,
  holidays,
  secondFourthSaturdayOff,
}: {
  month: string;
  today: string;
  timeZone: string;
  records: Attendance[];
  workDays: WorkDay[];
  holidays: Holiday[];
  secondFourthSaturdayOff: boolean;
}) {
  const days = daysOfMonth(month);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const blanks = mondayOffset(days[0] ?? `${month}-01`);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekdays.map((weekday) => (
        <div key={weekday} className="px-1 pb-1 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {weekday}
        </div>
      ))}
      {Array.from({ length: blanks }, (_, index) => (
        <div key={`blank-${index}`} />
      ))}
      {days.map((date) => {
        const record = byDate.get(date);
        const offLabel = dayOffLabel(date, holidays, secondFourthSaturdayOff);
        const off = !isExpected(date, workDays, holidays, secondFourthSaturdayOff);
        const future = date > today;
        const label = future
          ? ""
          : off
            ? ""
            : record?.status === "LATE"
              ? "L"
              : record?.status === "PRESENT"
                ? "P"
                : record?.status === "ABSENT"
                  ? "A"
                  : "–";
        const chip =
          label === "L"
            ? "bg-destructive/10 text-destructive"
            : label === "P"
              ? "bg-primary/15 text-primary"
              : label === "A"
                ? "bg-muted text-muted-foreground"
                : "text-muted-foreground";

        return (
          <div
            key={date}
            className={cn(
              "flex min-h-24 flex-col rounded-xl bg-card p-2 ring-1 ring-foreground/10",
              off && "bg-muted/50",
              date === today && "ring-2 ring-primary",
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <span className={cn("text-sm font-medium", off && "text-muted-foreground")}>{Number(date.slice(8))}</span>
              {label ? (
                <span className={cn("inline-flex size-6 items-center justify-center rounded-md text-[11px] font-medium", chip)}>{label}</span>
              ) : null}
            </div>
            {offLabel && (!record || record.status === "ABSENT" || off) ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{offLabel}</p>
            ) : null}
            {record?.checkInAt ? (
              <p className="mt-auto pt-2 text-[11px] leading-4 text-muted-foreground">
                {formatClock(record.checkInAt, timeZone)}
                {record.checkOutAt ? ` – ${formatClock(record.checkOutAt, timeZone)}` : ""}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
