"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { editEmployee } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function EmployeeEditor({
  employeeId,
  firstName,
  lastName,
  email,
  code,
  teamId,
  active,
  hasPin,
  teams,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  active: boolean;
  hasPin: boolean;
  teams: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const stored = {
    firstName,
    lastName,
    email,
    code,
    teamId: teamId ?? "",
    pin: "",
    active,
  };
  const [draft, setDraft] = useState(stored);
  const [saved, setSaved] = useState(stored);
  const dirty =
    draft.firstName !== saved.firstName ||
    draft.lastName !== saved.lastName ||
    draft.email !== saved.email ||
    draft.code !== saved.code ||
    draft.teamId !== saved.teamId ||
    draft.pin !== saved.pin ||
    draft.active !== saved.active;

  useEffect(() => {
    const next = {
      firstName,
      lastName,
      email,
      code,
      teamId: teamId ?? "",
      pin: "",
      active,
    };
    setDraft(next);
    setSaved(next);
  }, [employeeId, firstName, lastName, email, code, teamId, active]);

  function update(patch: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty) return;
    setPending(true);
    const result = await editEmployee({
      employeeId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      code: draft.code,
      teamId: teams.length > 0 ? draft.teamId || null : teamId,
      active: draft.active,
      pin: draft.pin,
    });
    setPending(false);
    setMessage(result.ok ? "Saved." : result.message);
    if (result.ok) {
      const next = {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim().toLowerCase(),
        code: draft.code.trim().toUpperCase(),
        teamId: draft.teamId,
        pin: "",
        active: draft.active,
      };
      setDraft(next);
      setSaved(next);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Profile</CardTitle>
          <CardDescription>
            {hasPin ? "Leave the PIN blank to keep the current one." : "Set a PIN so they can sign in."}
            {teams.length > 0 ? (
              <>
                {" "}
                A team is optional.{" "}
                <Link href="/admin/teams" className="text-primary underline-offset-4 hover:underline">
                  Manage teams
                </Link>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex justify-end sm:col-span-2">
            <Button type="button" variant={draft.active ? "default" : "outline"} onClick={() => update({ active: !draft.active })}>
              {draft.active ? "Active" : "Inactive"}
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-first">First name</Label>
            <Input id="edit-first" name="firstName" value={draft.firstName} onChange={(event) => update({ firstName: event.target.value })} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-last">Last name</Label>
            <Input id="edit-last" name="lastName" value={draft.lastName} onChange={(event) => update({ lastName: event.target.value })} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" name="email" type="email" value={draft.email} onChange={(event) => update({ email: event.target.value })} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-code">Code</Label>
            <Input id="edit-code" name="code" value={draft.code} onChange={(event) => update({ code: event.target.value })} required className="bg-card" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="edit-pin">Sign-in PIN</Label>
            <Input
              id="edit-pin"
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              minLength={4}
              maxLength={8}
              pattern="[0-9]{4,8}"
              value={draft.pin}
              onChange={(event) => update({ pin: event.target.value })}
              placeholder={hasPin ? "Leave blank to keep the current PIN" : "4 to 8 digits"}
              className="bg-card"
            />
          </div>
          {teams.length > 0 ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="edit-team">Team</Label>
              <NativeSelect id="edit-team" name="teamId" value={draft.teamId} onChange={(event) => update({ teamId: event.target.value })}>
                <option value="">No team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          {message ? <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
