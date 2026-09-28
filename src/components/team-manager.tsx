"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { addTeam, editTeam, removeTeam } from "@/lib/actions";

export function TeamManager({
  teams,
}: {
  teams: Array<{ id: string; name: string; count: number }>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await addTeam(name);
    setPending(false);
    setMessage(result.ok ? "Team added." : result.message);
    if (result.ok) {
      setName("");
      router.refresh();
    }
  }

  async function rename(id: string, nextName: string) {
    setPending(true);
    const result = await editTeam(id, nextName);
    setPending(false);
    setMessage(result.ok ? "Saved." : result.message);
    if (result.ok) router.refresh();
  }

  async function remove(id: string, teamName: string, count: number) {
    const note = count
      ? `Delete ${teamName}? ${count} ${count === 1 ? "person" : "people"} will be left without a team.`
      : `Delete ${teamName}?`;
    if (!window.confirm(note)) return;
    setPending(true);
    const result = await removeTeam(id);
    setPending(false);
    setMessage(result.ok ? "Team deleted." : result.message);
    if (result.ok) router.refresh();
  }

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl">New team</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Finance"
            className={field}
          />
          <button type="submit" disabled={pending} className="rounded-xl bg-ink px-4 py-2 text-paper disabled:opacity-60">
            Add team
          </button>
        </div>
      </form>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {teams.length === 0 ? <li className="px-4 py-6 text-sm text-muted">No teams yet. People can still be added without one.</li> : null}
        {teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <form
              className="flex flex-1 flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const nextName = String(new FormData(event.currentTarget).get("name") ?? "");
                void rename(team.id, nextName);
              }}
            >
              <input name="name" defaultValue={team.name} required className={field} />
              <button type="submit" disabled={pending} className="rounded-xl border border-line px-4 py-2 disabled:opacity-60">
                Save
              </button>
            </form>
            <p className="text-sm text-muted sm:w-28">{team.count === 1 ? "1 person" : `${team.count} people`}</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => void remove(team.id, team.name, team.count)}
              className="text-sm text-clay disabled:opacity-60"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
