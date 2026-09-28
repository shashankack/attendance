import { Desk } from "@/components/desk";
import { currentEmployee, currentUser } from "@/lib/actions";
import { getDirectory, getMonthAttendance, teamName } from "@/lib/store";
import { formatLongDay, officeDate } from "@/lib/time";

export default async function HomePage() {
  const user = await currentUser();
  const signedIn = await currentEmployee();
  const directory = await getDirectory();
  const today = officeDate(directory.office.timezone);
  const attendance = await getMonthAttendance(today.slice(0, 7));
  const showTeams = directory.teams.length > 0;
  const people = directory.employees
    .filter((employee) => employee.active)
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
    .map((employee) => {
      const record = attendance.find((item) => item.employeeId === employee.id && item.date === today) ?? null;
      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        code: employee.code,
        teamName: showTeams ? teamName(directory.teams, employee.teamId) : null,
        checkedIn: Boolean(record),
        checkedOut: Boolean(record?.checkOutAt),
        status: record?.status ?? null,
      };
    });

  const viewer = user?.role === "ADMIN" ? "admin" : signedIn ? "employee" : "guest";

  return <Desk day={formatLongDay(directory.office.timezone)} showTeams={showTeams} viewer={viewer} people={people} />;
}
