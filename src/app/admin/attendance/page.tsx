import Link from "next/link";
import { redirect } from "next/navigation";

import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { currentUser } from "@/lib/actions";
import { getDirectory, getMonthAttendance } from "@/lib/store";
import { isExpected } from "@/lib/schedule";
import { daysOfMonth, formatLongDay, officeDate, parseMonth } from "@/lib/time";

export default async function MonthlyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const directory = await getDirectory();
  const query = await searchParams;
  const month = parseMonth(query.month, directory.office.timezone);
  const today = officeDate(directory.office.timezone);
  const days = daysOfMonth(month);
  const attendance = await getMonthAttendance(month);
  const employees = [...directory.employees].sort((a, b) => a.firstName.localeCompare(b.firstName));

  const rows = employees.map((employee) => {
    const records = attendance.filter((record) => record.employeeId === employee.id);
    const byDate = new Map(records.map((record) => [record.date, record]));
    const absent = days.filter((date) => date <= today && isExpected(date, directory.office.workDays, directory.office.holidays) && !byDate.has(date)).length;
    return {
      employee,
      byDate,
      present: records.filter((record) => record.status === "PRESENT").length,
      late: records.filter((record) => record.status === "LATE").length,
      absent,
    };
  });

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(directory.office.timezone)} showTeams={directory.teams.length > 0}>
      <PageHeader title="Month" description="P is on time, L is late, and a dash is a working day with no check-in. Days off and holidays are left blank." />
      <div className="mt-6">
        <MonthNav month={month} hrefFor={(value) => `/admin/attendance?month=${value}`} />
      </div>
      <Card className="mt-6 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>On time</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Absent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell>
                    <Link href={`/admin/employees/${row.employee.id}?month=${month}`} className="font-medium underline-offset-4 hover:underline">
                      {row.employee.firstName} {row.employee.lastName}
                    </Link>
                    {!row.employee.active ? (
                      <span className="ml-2">
                        <StatusBadge tone="inactive">Inactive</StatusBadge>
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.present}</TableCell>
                  <TableCell>{row.late}</TableCell>
                  <TableCell>{row.absent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-8 overflow-x-auto py-2">
        <table className="min-w-max text-center text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="sticky left-0 bg-card px-3 py-3 text-left font-medium">Employee</th>
              {days.map((date) => (
                <th key={date} className={`px-1 py-3 font-medium ${isExpected(date, directory.office.workDays, directory.office.holidays) ? "" : "text-border"}`}>
                  {Number(date.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee.id} className="border-t">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium">
                  <Link href={`/admin/employees/${row.employee.id}?month=${month}`}>{row.employee.firstName}</Link>
                </th>
                {days.map((date) => {
                  const record = row.byDate.get(date);
                  const off = !isExpected(date, directory.office.workDays, directory.office.holidays);
                  const label = date > today ? "" : record ? (record.status === "LATE" ? "L" : "P") : off ? "" : "–";
                  const chip =
                    label === "L"
                      ? "bg-destructive/10 text-destructive"
                      : label === "P"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground";
                  return (
                    <td key={date} className="px-1 py-2">
                      {label ? (
                        <span className={cn("inline-flex size-6 items-center justify-center rounded-md text-[11px] font-medium", chip)}>{label}</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
