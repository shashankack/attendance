import { redirect } from "next/navigation";

import { CheckInPanel } from "@/components/check-in-panel";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthNav } from "@/components/month-nav";
import { Shell } from "@/components/shell";
import { currentEmployee } from "@/lib/actions";
import { attendanceInMonth, getDirectory } from "@/lib/store";
import { formatClock, formatLongDay, officeDate, parseMonth } from "@/lib/time";

export default async function MyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const employee = await currentEmployee();
  if (!employee) redirect("/");

  const directory = await getDirectory();
  const query = await searchParams;
  const month = parseMonth(query.month, directory.office.timezone);
  const today = officeDate(directory.office.timezone);
  const todayMonth = today.slice(0, 7);
  const records = await attendanceInMonth(employee.id, month);
  const todayRecords = month === todayMonth ? records : await attendanceInMonth(employee.id, todayMonth);
  const record = todayRecords.find((item) => item.date === today) ?? null;

  return (
    <Shell name={`${employee.firstName} ${employee.lastName}`} role="EMPLOYEE" day={formatLongDay(directory.office.timezone)}>
      <h1 className="font-serif text-4xl tracking-tight">Your attendance</h1>
      <p className="mt-2 text-muted-foreground">
        Mark arrival once, then log your leaving time on the same button. Sign-in and marking only work from the phone linked to your account.
      </p>
      <div className="mt-6 max-w-xl">
        <CheckInPanel
          employeeId={employee.id}
          firstName={employee.firstName}
          checkedIn={Boolean(record && record.status !== "ABSENT")}
          checkedOut={Boolean(record?.checkOutAt)}
          checkInLabel={record?.checkInAt ? formatClock(record.checkInAt, directory.office.timezone) : null}
          checkOutLabel={record?.checkOutAt ? formatClock(record.checkOutAt, directory.office.timezone) : null}
          status={record?.status ?? null}
          officeName={directory.office.name}
          latitude={directory.office.latitude}
          longitude={directory.office.longitude}
          radius={directory.office.allowedRadiusMeters}
          requireNetwork={directory.office.requireOfficeNetwork}
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} hrefFor={(value) => `/me?month=${value}`} />
        <p className="text-sm text-muted-foreground">P is on time, L is late, and A is absent. Days off and holidays are blank.</p>
      </div>
      <div className="mt-4">
        <MonthCalendar
          month={month}
          today={today}
          timeZone={directory.office.timezone}
          records={records}
          workDays={directory.office.workDays}
          holidays={directory.office.holidays}
          secondFourthSaturdayOff={directory.office.secondFourthSaturdayOff}
        />
      </div>
    </Shell>
  );
}
