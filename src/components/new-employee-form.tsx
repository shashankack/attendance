"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { addEmployee } from "@/lib/actions";

export function NewEmployeeForm({ teams }: { teams: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const teamId = String(form.get("teamId") ?? "");
    setPending(true);
    const result = await addEmployee({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      code: String(form.get("code") ?? ""),
      teamId: teamId || null,
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push(`/admin/employees/${result.employeeId}`);
    router.refresh();
  }

  const field = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2";

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-serif text-2xl">Add someone</h2>
      <p className="mt-1 text-sm text-muted">
        They mark attendance from the desk by tapping their name. A team is optional.{" "}
        <Link href="/admin/teams" className="underline-offset-4 hover:underline">
          Manage teams
        </Link>
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          First name
          <input name="firstName" required className={field} />
        </label>
        <label className="text-sm">
          Last name
          <input name="lastName" required className={field} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" type="email" required className={field} />
        </label>
        <label className="text-sm">
          Code
          <input name="code" required placeholder="EMP-060" className={field} />
        </label>
        <label className="text-sm sm:col-span-2">
          Team
          <select name="teamId" defaultValue="" className={field}>
            <option value="">No team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? <p className="mt-3 text-sm text-clay">{message}</p> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-ink px-4 py-2 text-paper disabled:opacity-60">
        {pending ? "Adding…" : "Add employee"}
      </button>
    </form>
  );
}
