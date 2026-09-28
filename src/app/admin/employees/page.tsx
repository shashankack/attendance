import Link from "next/link";
import { redirect } from "next/navigation";

import { NewEmployeeForm } from "@/components/new-employee-form";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser } from "@/lib/actions";
import { getDirectory, teamName } from "@/lib/store";
import { currentMonth, formatLongDay } from "@/lib/time";

export default async function EmployeesPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const directory = await getDirectory();
  const month = currentMonth(directory.office.timezone);
  const people = [...directory.employees].sort((a, b) => a.firstName.localeCompare(b.firstName));

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(directory.office.timezone)} showTeams={directory.teams.length > 0}>
      <PageHeader title="People" description="Open a person to edit their profile or read a month of attendance." />
      <Card className="mt-6 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {directory.teams.length > 0 ? <TableHead>Team</TableHead> : null}
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
                  {directory.teams.length > 0 ? <TableCell>{teamName(directory.teams, employee.teamId) ?? "—"}</TableCell> : null}
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
        <NewEmployeeForm teams={directory.teams} />
      </div>
    </Shell>
  );
}
