import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeEditor } from "@/components/employee-editor";
import { MonthNav } from "@/components/month-nav";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/actions";
import { attendanceInMonth, findEmployeeById, getDatabase, teamName } from "@/lib/store";
import { daysOfMonth, formatClock, formatLongDay, formatOfficeDay, isWeekend, officeDate, parseMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  const employee = findEmployeeById(id);
  if (!employee) notFound();

  const db = getDatabase();
  const office = db.office;
  const label = teamName(db.teams, employee.teamId) ?? "No team";
  const month = parseMonth(query.month, office.timezone);
  const today = officeDate(office.timezone);
  const records = attendanceInMonth(employee.id, month);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const present = records.filter((record) => record.status === "PRESENT").length;
  const late = records.filter((record) => record.status === "LATE").length;

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(office.timezone)}>
      <Link href="/admin/employees" className="text-sm text-muted hover:text-ink">
        All people
      </Link>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">
        {employee.firstName} {employee.lastName}
      </h1>
      <p className="mt-2 text-muted">
        {label} · {employee.email}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card px-4 py-5">
          <p className="text-sm text-muted">On time</p>
          <p className="mt-2 font-serif text-4xl">{present}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-5">
          <p className="text-sm text-muted">Late</p>
          <p className="mt-2 font-serif text-4xl">{late}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-5">
          <p className="text-sm text-muted">Marked days</p>
          <p className="mt-2 font-serif text-4xl">{records.length}</p>
        </div>
      </div>
      <div className="mt-8">
        <MonthNav month={month} hrefFor={(value) => `/admin/employees/${id}?month=${value}`} />
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Day</th>
              <th className="px-4 py-3 font-medium">In</th>
              <th className="px-4 py-3 font-medium">Out</th>
              <th className="px-4 py-3 font-medium">Distance</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {daysOfMonth(month).map((date) => {
              const record = byDate.get(date);
              const future = date > today;
              const weekend = isWeekend(date);
              let result = "Absent";
              if (future || weekend) result = "—";
              else if (!record) result = "Absent";
              else if (record.status === "LATE") result = record.checkOutAt ? "Late" : "Late · in";
              else result = record.checkOutAt ? "On time" : "In";

              return (
                <tr key={date} className="border-t border-line">
                  <td className="px-4 py-3">{formatOfficeDay(date, office.timezone)}</td>
                  <td className="px-4 py-3">{record ? formatClock(record.checkInAt, office.timezone) : "—"}</td>
                  <td className="px-4 py-3">{record?.checkOutAt ? formatClock(record.checkOutAt, office.timezone) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{record ? `${record.checkInDistanceMeters} m` : "—"}</td>
                  <td className={`px-4 py-3 ${result.startsWith("Late") ? "text-clay" : result === "Absent" ? "text-muted" : ""}`}>{result}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <EmployeeEditor
          employeeId={employee.id}
          firstName={employee.firstName}
          lastName={employee.lastName}
          email={employee.email}
          code={employee.code}
          teamId={employee.teamId}
          active={employee.active}
          teams={db.teams}
        />
      </div>
    </Shell>
  );
}
