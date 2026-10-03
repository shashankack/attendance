"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateSchedule } from "@/lib/actions";
import { filledWorkDays, holidayMonthDay, inputToMinutes, minutesToInput, weekdayNames, weekdayOrder } from "@/lib/schedule";
import { formatOfficeDay } from "@/lib/time";
import type { Holiday, WorkDay } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function scheduleKey(workDays: WorkDay[], holidays: Holiday[], secondFourthSaturdayOff: boolean) {
  return JSON.stringify({
    workDays: [...workDays].sort((a, b) => a.weekday - b.weekday),
    secondFourthSaturdayOff,
    holidays: [...holidays]
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.yearly) - Number(b.yearly))
      .map((holiday) => ({ date: holiday.date, name: holiday.name, yearly: holiday.yearly })),
  });
}

function holidayConflicts(existing: Holiday[], date: string, yearly: boolean) {
  const monthDay = holidayMonthDay(date);
  return existing.some((holiday) =>
    yearly || holiday.yearly ? holidayMonthDay(holiday.date) === monthDay : holiday.date === date,
  );
}

function holidayWhen(holiday: Holiday, timeZone: string) {
  if (!holiday.yearly) return formatOfficeDay(holiday.date, timeZone);
  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(new Date(`${holiday.date}T12:00:00+05:30`));
  return `${day} every year`;
}

export function ScheduleEditor({
  timeZone,
  workDays,
  holidays,
  secondFourthSaturdayOff,
}: {
  timeZone: string;
  workDays: WorkDay[];
  holidays: Holiday[];
  secondFourthSaturdayOff: boolean;
}) {
  const router = useRouter();
  const [days, setDays] = useState(() => filledWorkDays(workDays));
  const [dates, setDates] = useState(holidays);
  const [saturdayRule, setSaturdayRule] = useState(secondFourthSaturdayOff);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayYearly, setHolidayYearly] = useState(true);
  const [committed, setCommitted] = useState(() => scheduleKey(filledWorkDays(workDays), holidays, secondFourthSaturdayOff));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dirty = scheduleKey(days, dates, saturdayRule) !== committed;

  useEffect(() => {
    const nextDays = filledWorkDays(workDays);
    setDays(nextDays);
    setDates(holidays);
    setSaturdayRule(secondFourthSaturdayOff);
    setCommitted(scheduleKey(nextDays, holidays, secondFourthSaturdayOff));
  }, [workDays, holidays, secondFourthSaturdayOff]);

  function updateDay(weekday: number, patch: Partial<WorkDay>) {
    setDays((current) => current.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));
  }

  function setSecondFourthSaturday(value: boolean) {
    setSaturdayRule(value);
    if (value) updateDay(6, { working: true });
  }

  function addHoliday() {
    const name = holidayName.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
      setMessage("Enter a holiday date.");
      return;
    }
    if (!name) {
      setMessage("A holiday needs a name.");
      return;
    }
    if (holidayConflicts(dates, holidayDate, holidayYearly)) {
      setMessage(holidayYearly ? "That day already repeats every year." : "That date is already a holiday.");
      return;
    }
    setDates((current) =>
      [...current, { id: crypto.randomUUID(), date: holidayDate, name, yearly: holidayYearly }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setHolidayDate("");
    setHolidayName("");
    setMessage(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await updateSchedule({
      workDays: days,
      holidays: dates.map((holiday) => ({ date: holiday.date, name: holiday.name, yearly: holiday.yearly })),
      secondFourthSaturdayOff: saturdayRule,
    });
    setPending(false);
    setMessage(result.ok ? "Schedule saved. Any absences on holiday dates were cleared." : result.message);
    if (result.ok) {
      setCommitted(scheduleKey(days, dates, saturdayRule));
      router.refresh();
    }
  }

  return (
    <form onSubmit={(event) => void save(event)}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Working days</CardTitle>
          <CardDescription>
            Choose the days people are expected in, and the hours for each day. Arrival after the start time is late. Days off and holidays are not missed days.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            {weekdayOrder.map((weekday) => {
              const day = days.find((item) => item.weekday === weekday)!;
              return (
                <div key={weekday} className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-[10rem_1fr] sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={day.working}
                      onCheckedChange={(value) => updateDay(weekday, { working: value === true })}
                      disabled={saturdayRule && weekday === 6}
                    />
                    {weekdayNames[weekday]}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={`start-${weekday}`} className="sr-only">
                      {weekdayNames[weekday]} start
                    </Label>
                    <Input
                      id={`start-${weekday}`}
                      type="time"
                      value={minutesToInput(day.startMinutes)}
                      onChange={(event) => {
                        const minutes = inputToMinutes(event.target.value);
                        if (minutes != null) updateDay(weekday, { startMinutes: minutes });
                      }}
                      className="w-32 bg-card"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Label htmlFor={`end-${weekday}`} className="sr-only">
                      {weekdayNames[weekday]} end
                    </Label>
                    <Input
                      id={`end-${weekday}`}
                      type="time"
                      value={minutesToInput(day.endMinutes)}
                      onChange={(event) => {
                        const minutes = inputToMinutes(event.target.value);
                        if (minutes != null) updateDay(weekday, { endMinutes: minutes });
                      }}
                      className="w-32 bg-card"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <label className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={saturdayRule}
              onCheckedChange={(value) => setSecondFourthSaturday(value === true)}
            />
            <span>
              <span className="font-medium">2nd and 4th Saturdays off</span>
              <span className="mt-1 block text-muted-foreground">
                Saturday stays a working day for the 1st, 3rd, and 5th. The 2nd and 4th are holidays every month.
              </span>
            </span>
          </label>
          <div className="grid gap-3">
            <div>
              <h3 className="font-medium">Holidays</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Yearly holidays repeat every year on that date. One-off holidays apply only once. Save the schedule after adding a holiday so absences on that day are cleared.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} aria-label="Holiday date" className="bg-card sm:w-44" />
                <Input value={holidayName} onChange={(event) => setHolidayName(event.target.value)} placeholder="Holiday name" aria-label="Holiday name" className="bg-card" />
                <Button type="button" variant="outline" onClick={addHoliday}>
                  Add holiday
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={holidayYearly} onCheckedChange={(value) => setHolidayYearly(value === true)} />
                Repeats every year
              </label>
            </div>
            {dates.length === 0 ? <p className="text-sm text-muted-foreground">No holidays yet.</p> : null}
            <ul className="grid gap-2">
              {dates.map((holiday) => (
                <li key={holiday.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{holiday.name}</span>
                    <span className="ml-2 text-muted-foreground">{holidayWhen(holiday, timeZone)}</span>
                    {holiday.yearly ? <span className="ml-2 text-xs text-muted-foreground">yearly</span> : <span className="ml-2 text-xs text-muted-foreground">one-off</span>}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDates((current) => current.filter((item) => item.id !== holiday.id))}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save schedule"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
