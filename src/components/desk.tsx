"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Logo } from "@/components/logo";
import { SessionWatch } from "@/components/session-watch";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout } from "@/lib/actions";

export type DeskPerson = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  teamName: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
  status: "PRESENT" | "LATE" | null;
};

function initials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
}

function presence(person: DeskPerson) {
  if (!person.checkedIn) return { label: "Not in", tone: "absent" as const };
  if (person.checkedOut) return { label: "Left", tone: "left" as const };
  if (person.status === "LATE") return { label: "Late", tone: "late" as const };
  return { label: "In", tone: "in" as const };
}

export function Desk({
  day,
  showTeams,
  viewer,
  people,
}: {
  day: string;
  showTeams: boolean;
  viewer: "admin" | "employee" | "guest";
  people: DeskPerson[];
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) => {
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      return name.includes(needle) || person.code.toLowerCase().includes(needle);
    });
  }, [people, query]);

  const groups = useMemo(() => {
    if (!showTeams) return [{ name: "", people: visible }];
    const names = [...new Set(visible.map((person) => person.teamName).filter((name): name is string => Boolean(name)))].sort();
    const sections = names.map((name) => ({
      name,
      people: visible.filter((person) => person.teamName === name),
    }));
    const unassigned = visible.filter((person) => !person.teamName);
    if (unassigned.length) sections.push({ name: "No team", people: unassigned });
    return sections;
  }, [showTeams, visible]);

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,rgba(29,107,67,0.09),transparent_52%)] text-foreground">
      {viewer === "guest" ? null : <SessionWatch href={viewer === "admin" ? "/login" : "/"} />}
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <span className="flex items-center">
            <Logo />
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{day}</span>
            {viewer === "admin" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Dashboard</Link>
              </Button>
            ) : null}
            {viewer === "employee" ? (
              <>
                <Button size="sm" asChild>
                  <Link href="/me">Mark attendance</Link>
                </Button>
                <form action={logout}>
                  <Button type="submit" variant="ghost" size="sm">
                    Log off
                  </Button>
                </form>
              </>
            ) : null}
            {viewer === "guest" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Admin</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-serif text-4xl tracking-tight">Attendance</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Choose your name and sign in with your PIN. Mark arrival and leaving time on your own page.
        </p>
        <div className="relative mt-5 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code"
            className="h-10 bg-card pl-9"
          />
        </div>
        <div className="mt-6 space-y-6">
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has been added yet.</p>
          ) : groups.length === 0 || groups.every((group) => group.people.length === 0) ? (
            <p className="text-sm text-muted-foreground">No one matches that search.</p>
          ) : null}
          {groups.map((group) => (
            <div key={group.name || "everyone"}>
              {group.name ? (
                <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{group.name}</h2>
              ) : null}
              <ul className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${group.name ? "mt-2" : ""}`}>
                {group.people.map((person) => {
                  const state = presence(person);
                  return (
                    <li key={person.id}>
                      <Link
                        href={`/e/${person.id}`}
                        className="flex w-full items-center gap-3 rounded-xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10 transition-shadow hover:ring-primary/40"
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 font-medium text-primary">
                            {initials(person.firstName, person.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {person.firstName} {person.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">{person.code}</span>
                        </span>
                        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
