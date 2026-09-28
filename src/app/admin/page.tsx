import Link from "next/link";
import { redirect } from "next/navigation";

import { OfficeEditor } from "@/components/office-editor";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/actions";
import { getDatabase, teamName } from "@/lib/store";
import { formatClock, formatLongDay, officeDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const db = getDatabase();
  const today = officeDate(db.office.timezone);
  const todays = db.attendance.filter((record) => record.date === today);
  const employees = db.employees.filter((employee) => employee.active);

  const rows = employees.map((employee) => {
    const record = todays.find((item) => item.employeeId === employee.id) ?? null;
    return { employee, record };
  });

  const onSite = rows.filter((row) => row.record && !row.record.checkOutAt).length;
  const left = rows.filter((row) => row.record?.checkOutAt).length;
  const late = rows.filter((row) => row.record?.status === "LATE").length;
  const absent = rows.filter((row) => !row.record).length;

  const stats = [
    { label: "On site", value: onSite },
    { label: "Left", value: left },
    { label: "Late", value: late },
    { label: "Not in", value: absent },
  ];

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(db.office.timezone)}>
      <p className="text-muted">{db.office.name}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Who is here</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-card px-4 py-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 font-serif text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">In</th>
              <th className="px-4 py-3 font-medium">Out</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employee, record }) => (
              <tr key={employee.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/employees/${employee.id}`} className="underline-offset-4 hover:underline">
                    {employee.firstName} {employee.lastName}
                  </Link>
                  <span className="ml-2 text-muted">{employee.code}</span>
                </td>
                <td className="px-4 py-3 text-muted">{teamName(db.teams, employee.teamId) ?? "—"}</td>
                <td className="px-4 py-3">{record ? formatClock(record.checkInAt, db.office.timezone) : "—"}</td>
                <td className="px-4 py-3">{record?.checkOutAt ? formatClock(record.checkOutAt, db.office.timezone) : "—"}</td>
                <td className="px-4 py-3">
                  {!record ? "Not in" : record.checkOutAt ? "Left" : record.status === "LATE" ? "Late" : "In"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <OfficeEditor office={db.office} />
      </div>
    </Shell>
  );
}
