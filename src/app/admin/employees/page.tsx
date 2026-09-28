import Link from "next/link";
import { redirect } from "next/navigation";

import { NewEmployeeForm } from "@/components/new-employee-form";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <PageHeader title="People" description="Open a person to edit their profile or read a month of attendance." />
      <Card className="mt-6 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link href={`/admin/employees/${employee.id}?month=${month}`} className="font-medium underline-offset-4 hover:underline">
                      {employee.firstName} {employee.lastName}
                    </Link>
                    <span className="ml-2 text-muted-foreground">{employee.code}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                  <TableCell>{teamName(db.teams, employee.teamId) ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={employee.active ? "active" : "inactive"}>{employee.active ? "Active" : "Inactive"}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="mt-8">
        <NewEmployeeForm teams={db.teams} />
      </div>
    </Shell>
  );
}
