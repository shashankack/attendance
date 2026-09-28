import { redirect } from "next/navigation";

import { Shell } from "@/components/shell";
import { TeamManager } from "@/components/team-manager";
import { currentUser } from "@/lib/actions";
import { getDatabase } from "@/lib/store";
import { formatLongDay } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const db = getDatabase();
  const teams = [...db.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      id: team.id,
      name: team.name,
      count: db.employees.filter((employee) => employee.teamId === team.id).length,
    }));

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(db.office.timezone)}>
      <h1 className="font-serif text-4xl tracking-tight">Teams</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Create, rename, or delete teams. A person can belong to one team, or to none. Deleting a team leaves its people unassigned.
      </p>
      <div className="mt-8">
        <TeamManager teams={teams} />
      </div>
    </Shell>
  );
}
