import { redirect } from "next/navigation";

import { CheckInPanel } from "@/components/check-in-panel";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/actions";
import { findEmployeeByUserId, getOffice, historyFor, todayRecord } from "@/lib/store";
import { formatClock, formatLongDay, formatOfficeDay, greeting } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EmployeePage() {
  const user = await currentUser();
  if (!user || user.role !== "EMPLOYEE") redirect("/");
  const employee = findEmployeeByUserId(user.id);
  if (!employee) redirect("/");

  const office = getOffice();
  const today = todayRecord(employee.id);
  const history = historyFor(employee.id).slice(0, 8);

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(office.timezone)}>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="text-muted">
            {greeting(office.timezone)}, {employee.firstName}
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Today</h1>
          <div className="mt-6">
            <CheckInPanel
              checkedIn={Boolean(today)}
              checkedOut={Boolean(today?.checkOutAt)}
              checkInLabel={today ? formatClock(today.checkInAt, office.timezone) : null}
              checkOutLabel={today?.checkOutAt ? formatClock(today.checkOutAt, office.timezone) : null}
              status={today?.status ?? null}
              officeName={office.name}
              radius={office.allowedRadiusMeters}
            />
          </div>
        </div>
        <aside>
          <h2 className="font-serif text-2xl">Recent days</h2>
          <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-card">
            {history.map((record) => (
              <li key={record.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{formatOfficeDay(record.date, office.timezone)}</span>
                <span className="text-muted">
                  {formatClock(record.checkInAt, office.timezone)}
                  {record.checkOutAt ? ` – ${formatClock(record.checkOutAt, office.timezone)}` : " · in"}
                </span>
                <span className={record.status === "LATE" ? "text-clay" : "text-pine"}>{record.status === "LATE" ? "Late" : "On time"}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Shell>
  );
}
