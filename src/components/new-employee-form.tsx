"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { addEmployee } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

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

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Add someone</CardTitle>
          <CardDescription>
            They mark attendance from the desk by tapping their name. A team is optional.{" "}
            <Link href="/admin/teams" className="text-primary underline-offset-4 hover:underline">
              Manage teams
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new-first">First name</Label>
            <Input id="new-first" name="firstName" required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-last">Last name</Label>
            <Input id="new-last" name="lastName" required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" name="email" type="email" required className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-code">Code</Label>
            <Input id="new-code" name="code" required placeholder="EMP-060" className="bg-card" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="new-team">Team</Label>
            <NativeSelect id="new-team" name="teamId" defaultValue="">
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          {message ? <p className="text-sm text-destructive sm:col-span-2">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add employee"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
