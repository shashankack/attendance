import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeEditor } from "@/components/employee-editor";
import { MonthNav } from "@/components/month-nav";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <Button variant="link" asChild className="h-auto px-0 text-muted-foreground">
        <Link href="/admin/employees">All people</Link>
      </Button>
      <div className="mt-3 flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback className="bg-primary/10 font-medium text-primary">
            {`${employee.firstName.slice(0, 1)}${employee.lastName.slice(0, 1)}`.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-serif text-4xl tracking-tight">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {label} · {employee.email}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "On time", value: present },
          { label: "Late", value: late },
          { label: "Marked days", value: records.length },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <CardTitle className="font-serif text-4xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <MonthNav month={month} hrefFor={(value) => `/admin/employees/${id}?month=${value}`} />
      </div>
      <Card className="mt-4 py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysOfMonth(month).map((date) => {
                const record = byDate.get(date);
                const future = date > today;
                const weekend = isWeekend(date);
                let result = "Absent";
                if (future || weekend) result = "—";
                else if (!record) result = "Absent";
                else if (record.status === "LATE") result = record.checkOutAt ? "Late" : "Late · in";
                else result = record.checkOutAt ? "On time" : "In";
                const tone = result.startsWith("Late") ? "late" : result === "Absent" ? "absent" : result === "—" ? null : "in";

                return (
                  <TableRow key={date}>
                    <TableCell>{formatOfficeDay(date, office.timezone)}</TableCell>
                    <TableCell>{record ? formatClock(record.checkInAt, office.timezone) : "—"}</TableCell>
                    <TableCell>{record?.checkOutAt ? formatClock(record.checkOutAt, office.timezone) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{record ? `${record.checkInDistanceMeters} m` : "—"}</TableCell>
                    <TableCell>{tone ? <StatusBadge tone={tone}>{result}</StatusBadge> : result}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
