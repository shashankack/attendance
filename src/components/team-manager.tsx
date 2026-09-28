"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { addTeam, editTeam, removeTeam } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">New team</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
            <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Finance" className="bg-card" />
            <Button type="submit" disabled={pending}>
              Add team
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="gap-0 py-0">
        {teams.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">No teams yet. People can still be added without one.</p> : null}
        {teams.map((team, index) => (
          <div key={team.id}>
            {index > 0 ? <Separator /> : null}
            <form
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
              onSubmit={(event) => {
                event.preventDefault();
                const nextName = String(new FormData(event.currentTarget).get("name") ?? "");
                void rename(team.id, nextName);
              }}
            >
              <Input name="name" defaultValue={team.name} required className="bg-card sm:max-w-sm" />
              <Badge variant="secondary" className="h-6 w-fit">
                {team.count === 1 ? "1 person" : `${team.count} people`}
              </Badge>
              <div className="flex gap-2 sm:ml-auto">
                <Button type="submit" variant="outline" disabled={pending}>
                  Save
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => void remove(team.id, team.name, team.count)} className="text-destructive">
                  Delete
                </Button>
              </div>
            </form>
          </div>
        ))}
      </Card>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
