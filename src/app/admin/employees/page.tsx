import Link from "next/link";
import { redirect } from "next/navigation";

import { NewEmployeeForm } from "@/components/new-employee-form";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/actions";
import { getDatabase, teamName } from "@/lib/store";
import { currentMonth, formatLongDay } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const db = getDatabase();
  const month = currentMonth(db.office.timezone);
  const people = [...db.employees].sort((a, b) => a.firstName.localeCompare(b.firstName));

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(db.office.timezone)}>
      <h1 className="font-serif text-4xl tracking-tight">People</h1>
      <p className="mt-2 text-muted">Open a person to edit their profile or read a month of attendance.</p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((employee) => (
              <tr key={employee.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/employees/${employee.id}?month=${month}`} className="underline-offset-4 hover:underline">
                    {employee.firstName} {employee.lastName}
                  </Link>
                  <span className="ml-2 text-muted">{employee.code}</span>
                </td>
                <td className="px-4 py-3 text-muted">{employee.email}</td>
                <td className="px-4 py-3">{teamName(db.teams, employee.teamId) ?? "—"}</td>
                <td className="px-4 py-3">{employee.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <NewEmployeeForm teams={db.teams} />
      </div>
    </Shell>
  );
}
