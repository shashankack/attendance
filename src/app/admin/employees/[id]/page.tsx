import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeEditor } from "@/components/employee-editor";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthNav } from "@/components/month-nav";
import { Shell } from "@/components/shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/actions";
import { attendanceInMonth, employeeHasDevice, findEmployeeById, getDirectory, teamName } from "@/lib/store";
import { formatLongDay, officeDate, parseMonth } from "@/lib/time";

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
  const employee = await findEmployeeById(id);
  if (!employee) notFound();

  const directory = await getDirectory();
  const office = directory.office;
  const showTeams = directory.teams.length > 0;
  const teamLabel = showTeams ? (teamName(directory.teams, employee.teamId) ?? "No team") : null;
  const month = parseMonth(query.month, office.timezone);
  const today = officeDate(office.timezone);
  const records = await attendanceInMonth(employee.id, month);
  const hasDevice = await employeeHasDevice(employee.id);
  const present = records.filter((record) => record.status === "PRESENT").length;
  const late = records.filter((record) => record.status === "LATE").length;
  const absent = records.filter((record) => record.status === "ABSENT").length;

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(office.timezone)} showTeams={showTeams}>
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
            {teamLabel ? `${teamLabel} · ` : null}
            {employee.email}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "On time", value: present },
          { label: "Late", value: late },
          { label: "Absent", value: absent },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <CardTitle className="font-serif text-4xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} hrefFor={(value) => `/admin/employees/${id}?month=${value}`} />
        <p className="text-sm text-muted-foreground">P is on time, L is late, and A is absent. Days off and holidays are blank.</p>
      </div>
      <div className="mt-4">
        <MonthCalendar month={month} today={today} timeZone={office.timezone} records={records} workDays={office.workDays} holidays={office.holidays} />
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
          hasPin={Boolean(employee.pinHash)}
          hasDevice={hasDevice}
          teams={directory.teams}
        />
      </div>
    </Shell>
  );
}
