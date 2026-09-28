import Link from "next/link";
import { redirect } from "next/navigation";

import { MonthNav } from "@/components/month-nav";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/actions";
import { getDatabase } from "@/lib/store";
import { daysOfMonth, formatLongDay, isWeekend, officeDate, parseMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MonthlyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const db = getDatabase();
  const query = await searchParams;
  const month = parseMonth(query.month, db.office.timezone);
  const today = officeDate(db.office.timezone);
  const days = daysOfMonth(month);
  const employees = [...db.employees].sort((a, b) => a.firstName.localeCompare(b.firstName));

  const rows = employees.map((employee) => {
    const records = db.attendance.filter((record) => record.employeeId === employee.id && record.date.startsWith(`${month}-`));
    const byDate = new Map(records.map((record) => [record.date, record]));
    const absent = days.filter((date) => date <= today && !isWeekend(date) && !byDate.has(date)).length;
    return {
      employee,
      byDate,
      present: records.filter((record) => record.status === "PRESENT").length,
      late: records.filter((record) => record.status === "LATE").length,
      absent,
    };
  });

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(db.office.timezone)}>
      <h1 className="font-serif text-4xl tracking-tight">Month</h1>
      <p className="mt-2 max-w-2xl text-muted">P is on time, L is late, and a dash is a weekday with no check-in. Weekends are left blank.</p>
      <div className="mt-6">
        <MonthNav month={month} hrefFor={(value) => `/admin/attendance?month=${value}`} />
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">On time</th>
              <th className="px-4 py-3 font-medium">Late</th>
              <th className="px-4 py-3 font-medium">Absent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/employees/${row.employee.id}?month=${month}`} className="underline-offset-4 hover:underline">
                    {row.employee.firstName} {row.employee.lastName}
                  </Link>
                  {!row.employee.active ? <span className="ml-2 text-clay">Inactive</span> : null}
                </td>
                <td className="px-4 py-3">{row.present}</td>
                <td className="px-4 py-3">{row.late}</td>
                <td className="px-4 py-3">{row.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="min-w-max text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="sticky left-0 bg-card px-3 py-3 text-left font-medium">Employee</th>
              {days.map((date) => (
                <th key={date} className={`px-1 py-3 font-medium ${isWeekend(date) ? "text-line" : ""}`}>
                  {Number(date.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee.id} className="border-t border-line">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium">
                  <Link href={`/admin/employees/${row.employee.id}?month=${month}`}>{row.employee.firstName}</Link>
                </th>
                {days.map((date) => {
                  const record = row.byDate.get(date);
                  const weekend = isWeekend(date);
                  const label = weekend || date > today ? "" : record ? (record.status === "LATE" ? "L" : "P") : "–";
                  const tone = label === "L" ? "text-clay" : label === "P" ? "text-pine" : "text-muted";
                  return (
                    <td key={date} className={`px-1 py-2 ${tone}`}>
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
