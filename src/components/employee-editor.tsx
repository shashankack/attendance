"use client";

import Link from "next/link";
import { useState } from "react";
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

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Profile</CardTitle>
          <CardDescription>
            A team is optional.{" "}
            <Link href="/admin/teams" className="text-primary underline-offset-4 hover:underline">
              Manage teams
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex justify-end sm:col-span-2">
            <Button type="button" variant={isActive ? "default" : "outline"} onClick={() => setIsActive((value) => !value)}>
              {isActive ? "Active" : "Inactive"}
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-first">First name</Label>
            <Input id="edit-first" name="firstName" defaultValue={firstName} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-last">Last name</Label>
            <Input id="edit-last" name="lastName" defaultValue={lastName} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" name="email" type="email" defaultValue={email} required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-code">Code</Label>
            <Input id="edit-code" name="code" defaultValue={code} required className="bg-card" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="edit-team">Team</Label>
            <NativeSelect id="edit-team" name="teamId" defaultValue={teamId ?? ""}>
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
