import { Desk } from "@/components/desk";
import { currentUser } from "@/lib/actions";
import { getDatabase, teamName } from "@/lib/store";
import { formatClock, formatLongDay, officeDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  const db = getDatabase();
  const today = officeDate(db.office.timezone);
  const people = db.employees
    .filter((employee) => employee.active)
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
    .map((employee) => {
      const record = db.attendance.find((item) => item.employeeId === employee.id && item.date === today) ?? null;
      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        code: employee.code,
        teamId: employee.teamId,
        teamName: teamName(db.teams, employee.teamId),
        checkedIn: Boolean(record),
        checkedOut: Boolean(record?.checkOutAt),
        checkInLabel: record ? formatClock(record.checkInAt, db.office.timezone) : null,
        checkOutLabel: record?.checkOutAt ? formatClock(record.checkOutAt, db.office.timezone) : null,
        status: record?.status ?? null,
      };
    });

  return (
    <Desk
      day={formatLongDay(db.office.timezone)}
      officeName={db.office.name}
      radius={db.office.allowedRadiusMeters}
      admin={user?.role === "ADMIN"}
      people={people}
    />
  );
}
