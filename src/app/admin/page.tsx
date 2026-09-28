import Link from "next/link";
import { redirect } from "next/navigation";

import { OfficeEditor } from "@/components/office-editor";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser } from "@/lib/actions";
import { getDirectory, getMonthAttendance, teamName } from "@/lib/store";
import { formatClock, formatLongDay, officeDate } from "@/lib/time";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const directory = await getDirectory();
  const today = officeDate(directory.office.timezone);
  const attendance = await getMonthAttendance(today.slice(0, 7));
  const todays = attendance.filter((record) => record.date === today);
  const employees = directory.employees.filter((employee) => employee.active);

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
    <Shell name={user.name} role={user.role} day={formatLongDay(directory.office.timezone)} showTeams={directory.teams.length > 0}>
      <PageHeader eyebrow={directory.office.name} title="Who is here" />
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <CardTitle className="font-serif text-4xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="mt-8 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {directory.teams.length > 0 ? <TableHead>Team</TableHead> : null}
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ employee, record }) => {
                const tone = !record ? "absent" : record.checkOutAt ? "left" : record.status === "LATE" ? "late" : "in";
                const label = !record ? "Not in" : record.checkOutAt ? "Left" : record.status === "LATE" ? "Late" : "In";
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Link href={`/admin/employees/${employee.id}`} className="font-medium underline-offset-4 hover:underline">
                        {employee.firstName} {employee.lastName}
                      </Link>
                      <span className="ml-2 text-muted-foreground">{employee.code}</span>
                    </TableCell>
                    {directory.teams.length > 0 ? (
                      <TableCell className="text-muted-foreground">{teamName(directory.teams, employee.teamId) ?? "—"}</TableCell>
                    ) : null}
                    <TableCell>{record ? formatClock(record.checkInAt, directory.office.timezone) : "—"}</TableCell>
                    <TableCell>{record?.checkOutAt ? formatClock(record.checkOutAt, directory.office.timezone) : "—"}</TableCell>
                    <TableCell>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="mt-8">
        <OfficeEditor office={directory.office} />
      </div>
    </Shell>
  );
}
