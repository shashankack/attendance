"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CheckInPanel } from "@/components/check-in-panel";

export type DeskPerson = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  teamId: string | null;
  teamName: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  status: "PRESENT" | "LATE" | null;
};

export function Desk({
  day,
  officeName,
  radius,
  admin,
  people,
}: {
  day: string;
  officeName: string;
  radius: number;
  admin: boolean;
  people: DeskPerson[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) => {
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      return name.includes(needle) || person.code.toLowerCase().includes(needle);
    });
  }, [people, query]);

  const groups = useMemo(() => {
    const names = [...new Set(visible.map((person) => person.teamName).filter((name): name is string => Boolean(name)))].sort();
    const sections = names.map((name) => ({
      name,
      people: visible.filter((person) => person.teamName === name),
    }));
    const unassigned = visible.filter((person) => !person.teamName);
    if (unassigned.length) sections.push({ name: "No team", people: unassigned });
    return sections;
  }, [visible]);

  const selected = people.find((person) => person.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <span className="font-serif text-xl tracking-tight">BAW</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{day}</span>
            <Link href={admin ? "/admin" : "/login"} className="text-muted underline-offset-4 hover:text-ink hover:underline">
              {admin ? "Dashboard" : "Admin"}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h1 className="font-serif text-4xl tracking-tight">Mark attendance</h1>
          <p className="mt-2 max-w-xl text-muted">Tap your name. The office checks your location. No password.</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code"
            className="mt-5 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-pine"
          />
          <div className="mt-6 space-y-6">
            {groups.length === 0 ? <p className="text-sm text-muted">No one matches that search.</p> : null}
            {groups.map((group) => (
              <div key={group.name}>
                <h2 className="text-sm uppercase tracking-[0.16em] text-muted">{group.name}</h2>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.people.map((person) => {
                    const label = !person.checkedIn ? "Not in" : person.checkedOut ? "Left" : person.status === "LATE" ? "Late" : "In";
                    const tone = label === "Late" ? "text-clay" : label === "In" ? "text-pine" : "text-muted";
                    const selectedCard = person.id === selectedId;
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(person.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left ${selectedCard ? "border-ink bg-card" : "border-line bg-card hover:border-ink"}`}
                        >
                          <span className="block font-medium">
                            {person.firstName} {person.lastName}
                          </span>
                          <span className="mt-1 flex items-center justify-between text-sm">
                            <span className="text-muted">{person.code}</span>
                            <span className={tone}>{label}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section>
          {selected ? (
            <CheckInPanel
              employeeId={selected.id}
              firstName={selected.firstName}
              checkedIn={selected.checkedIn}
              checkedOut={selected.checkedOut}
              checkInLabel={selected.checkInLabel}
              checkOutLabel={selected.checkOutLabel}
              status={selected.status}
              officeName={officeName}
              radius={radius}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-card p-8 text-muted">
              Choose yourself to check in or out.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
