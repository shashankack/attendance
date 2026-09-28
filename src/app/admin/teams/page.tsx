import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Shell } from "@/components/shell";
import { TeamManager } from "@/components/team-manager";
import { currentUser } from "@/lib/actions";
import { getDirectory } from "@/lib/store";
import { formatLongDay } from "@/lib/time";

export default async function TeamsPage() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const directory = await getDirectory();
  const teams = [...directory.teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      id: team.id,
      name: team.name,
      count: directory.employees.filter((employee) => employee.teamId === team.id).length,
    }));

  return (
    <Shell name={user.name} role={user.role} day={formatLongDay(directory.office.timezone)} showTeams={directory.teams.length > 0}>
      <PageHeader
        title="Teams"
        description="Create, rename, or delete teams. A person can belong to one team, or to none. Deleting a team leaves its people unassigned."
      />
      <div className="mt-8">
        <TeamManager teams={teams} />
      </div>
    </Shell>
  );
}
