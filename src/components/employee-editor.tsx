"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { editEmployee } from "@/lib/actions";

export function EmployeeEditor({
  employeeId,
  firstName,
  lastName,
  email,
  code,
  teamId,
  active,
  teams,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  active: boolean;
  teams: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isActive, setIsActive] = useState(active);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextTeam = String(form.get("teamId") ?? "");
    setPending(true);
    const result = await editEmployee({
      employeeId,
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      code: String(form.get("code") ?? ""),
      teamId: nextTeam || null,
      active: isActive,
    });
    setPending(false);
    setMessage(result.ok ? "Saved." : result.message);
    if (result.ok) router.refresh();
  }

  const field = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2";

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Profile</h2>
        <button
          type="button"
          onClick={() => setIsActive((value) => !value)}
          className={`rounded-full px-3 py-1 text-sm ${isActive ? "bg-pine text-white" : "bg-paper text-clay"}`}
        >
          {isActive ? "Active" : "Inactive"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        A team is optional.{" "}
        <Link href="/admin/teams" className="underline-offset-4 hover:underline">
          Manage teams
        </Link>
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          First name
          <input name="firstName" defaultValue={firstName} required className={field} />
        </label>
        <label className="text-sm">
          Last name
          <input name="lastName" defaultValue={lastName} required className={field} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" type="email" defaultValue={email} required className={field} />
        </label>
        <label className="text-sm">
          Code
          <input name="code" defaultValue={code} required className={field} />
        </label>
        <label className="text-sm sm:col-span-2">
          Team
          <select name="teamId" defaultValue={teamId ?? ""} className={field}>
            <option value="">No team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-ink px-4 py-2 text-paper disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
