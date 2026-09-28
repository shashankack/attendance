import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { Attendance, AttendanceStatus, Database, Employee, Office, Team, User } from "./types";
import { officeDate, officeMinutes } from "./time";

const START_MINUTES = 10 * 60;
const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "db.json");

type LegacyEmployee = {
  id: string;
  userId?: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  teamId?: string | null;
  officeId: string;
  active: boolean;
};

type LegacyFile = {
  users: User[];
  teams?: Team[];
  employees: LegacyEmployee[];
  office: Office;
  attendance: Attendance[];
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function daysAgo(count: number) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
}

function atLocal(date: string, hour: number, minute: number) {
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`,
  ).toISOString();
}

function seed(): Database {
  const office: Office = {
    id: crypto.randomUUID(),
    name: "Bangalore HQ",
    latitude: 12.9716,
    longitude: 77.5946,
    allowedRadiusMeters: 150,
    timezone: "Asia/Kolkata",
    publicIp: "",
    requireOfficeNetwork: false,
  };

  const teams: Team[] = [
    { id: crypto.randomUUID(), name: "Engineering" },
    { id: crypto.randomUUID(), name: "Design" },
    { id: crypto.randomUUID(), name: "Product" },
    { id: crypto.randomUUID(), name: "Sales" },
  ];
  const teamId = (name: string) => teams.find((team) => team.name === name)?.id ?? null;

  const admin: User = {
    id: crypto.randomUUID(),
    email: "admin@baw.dev",
    name: "Priya Shah",
    role: "ADMIN",
    passwordHash: hashPassword("password"),
  };

  const people: Array<Omit<Employee, "id" | "officeId">> = [
    { code: "EMP-014", firstName: "Arun", lastName: "Mehta", email: "arun@baw.dev", teamId: teamId("Engineering"), active: true },
    { code: "EMP-021", firstName: "Meera", lastName: "Iyer", email: "meera@baw.dev", teamId: teamId("Engineering"), active: true },
    { code: "EMP-033", firstName: "Kabir", lastName: "Das", email: "kabir@baw.dev", teamId: teamId("Design"), active: true },
    { code: "EMP-040", firstName: "Sara", lastName: "Khan", email: "sara@baw.dev", teamId: teamId("Product"), active: true },
    { code: "EMP-018", firstName: "Dev", lastName: "Patel", email: "dev@baw.dev", teamId: teamId("Engineering"), active: true },
    { code: "EMP-052", firstName: "Neel", lastName: "Joshi", email: "neel@baw.dev", teamId: null, active: true },
  ];

  const employees: Employee[] = people.map((person) => ({
    ...person,
    id: crypto.randomUUID(),
    officeId: office.id,
  }));

  const byName = (name: string) => employees.find((employee) => employee.firstName === name)!;
  const today = officeDate(office.timezone);
  const attendance: Attendance[] = [];

  const add = (
    firstName: string,
    date: string,
    inHour: number,
    inMinute: number,
    outHour?: number,
    outMinute?: number,
  ) => {
    const status: AttendanceStatus = inHour * 60 + inMinute > START_MINUTES ? "LATE" : "PRESENT";
    attendance.push({
      id: crypto.randomUUID(),
      employeeId: byName(firstName).id,
      officeId: office.id,
      date,
      checkInAt: atLocal(date, inHour, inMinute),
      checkOutAt: outHour == null ? null : atLocal(date, outHour, outMinute ?? 0),
      checkInDistanceMeters: 18 + (inMinute % 7) * 4,
      checkOutDistanceMeters: outHour == null ? null : 22,
      status,
    });
  };

  add("Meera", today, 9, 12);
  add("Kabir", today, 9, 41);
  add("Sara", today, 10, 18);
  add("Dev", today, 9, 5, 18, 2);

  for (let offset = 1; offset <= 12; offset += 1) {
    const date = officeDate(office.timezone, daysAgo(offset));
    const weekday = new Date(`${date}T12:00:00+05:30`).getDay();
    if (weekday === 0 || weekday === 6) continue;
    add("Arun", date, offset % 5 === 0 ? 10 : 9, 10 + offset, 18, 5);
    add("Meera", date, 9, 8, 18, 10);
    add("Kabir", date, 9, 30, 17, 50);
  }

  return { users: [admin], teams, employees, office, attendance };
}

function normalize(raw: LegacyFile): { db: Database; migrated: boolean } {
  const teams: Team[] = Array.isArray(raw.teams) ? raw.teams.map((team) => ({ ...team })) : [];
  const teamByName = new Map(teams.map((team) => [team.name.trim().toLowerCase(), team]));
  let migrated = !Array.isArray(raw.teams);

  const ensureTeam = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = teamByName.get(trimmed.toLowerCase());
    if (existing) return existing.id;
    const team = { id: crypto.randomUUID(), name: trimmed };
    teams.push(team);
    teamByName.set(trimmed.toLowerCase(), team);
    migrated = true;
    return team.id;
  };

  const usersById = new Map(raw.users.map((user) => [user.id, user]));
  const employees: Employee[] = raw.employees.map((employee) => {
    const account = employee.userId ? usersById.get(employee.userId) : undefined;
    if (employee.userId || employee.department !== undefined || employee.teamId === undefined || !employee.email) {
      migrated = true;
    }
    const teamId =
      employee.teamId !== undefined ? employee.teamId : ensureTeam(employee.department ?? "");
    return {
      id: employee.id,
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: (employee.email ?? account?.email ?? "").trim().toLowerCase(),
      teamId,
      officeId: employee.officeId,
      active: employee.active,
    };
  });

  const users = raw.users.filter((user) => user.role === "ADMIN");
  if (users.length !== raw.users.length) migrated = true;

  return {
    migrated,
    db: { users, teams, employees, office: raw.office, attendance: raw.attendance },
  };
}

function read(): Database {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as LegacyFile;
    const { db, migrated } = normalize(parsed);
    if (migrated) write(db);
    return db;
  } catch {
    const seeded = seed();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(dataFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }
}

function write(db: Database) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

let queue: Promise<unknown> = Promise.resolve();

function update<T>(change: (db: Database) => T): Promise<T> {
  const run = queue.then(() => {
    const db = read();
    const result = change(db);
    write(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function getDatabase() {
  return read();
}

export function teamName(teams: Team[], teamId: string | null) {
  if (!teamId) return null;
  return teams.find((team) => team.id === teamId)?.name ?? null;
}

export function findUserByEmail(email: string) {
  return read().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findUserById(id: string) {
  return read().users.find((user) => user.id === id) ?? null;
}

export function getOffice() {
  return read().office;
}

export function todayRecord(employeeId: string) {
  const office = getOffice();
  const date = officeDate(office.timezone);
  return read().attendance.find((record) => record.employeeId === employeeId && record.date === date) ?? null;
}

export function historyFor(employeeId: string) {
  return read()
    .attendance.filter((record) => record.employeeId === employeeId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function saveOffice(next: Pick<Office, "name" | "latitude" | "longitude" | "allowedRadiusMeters" | "publicIp" | "requireOfficeNetwork">) {
  return update((db) => {
    db.office = { ...db.office, ...next };
    return db.office;
  });
}

export async function markCheckIn(input: { employeeId: string; distanceMeters: number }) {
  return update((db) => {
    const date = officeDate(db.office.timezone);
    const existing = db.attendance.find((record) => record.employeeId === input.employeeId && record.date === date);
    if (existing) return { ok: false as const, reason: "already-in" as const };

    const now = new Date();
    const status: AttendanceStatus = officeMinutes(db.office.timezone, now) > START_MINUTES ? "LATE" : "PRESENT";
    const record: Attendance = {
      id: crypto.randomUUID(),
      employeeId: input.employeeId,
      officeId: db.office.id,
      date,
      checkInAt: now.toISOString(),
      checkOutAt: null,
      checkInDistanceMeters: Math.round(input.distanceMeters),
      checkOutDistanceMeters: null,
      status,
    };
    db.attendance.push(record);
    return { ok: true as const, record };
  });
}

export function findEmployeeById(id: string) {
  return read().employees.find((employee) => employee.id === id) ?? null;
}

export function attendanceInMonth(employeeId: string, month: string) {
  return read()
    .attendance.filter((record) => record.employeeId === employeeId && record.date.startsWith(`${month}-`))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function teamExists(db: Database, teamId: string | null) {
  return teamId == null || db.teams.some((team) => team.id === teamId);
}

export async function createEmployee(input: {
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
}) {
  return update((db) => {
    const email = input.email.trim().toLowerCase();
    const code = input.code.trim().toUpperCase();
    if (!teamExists(db, input.teamId)) return { ok: false as const, reason: "team" as const };
    if (db.employees.some((employee) => employee.email.toLowerCase() === email)) {
      return { ok: false as const, reason: "email" as const };
    }
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      return { ok: false as const, reason: "email" as const };
    }
    if (db.employees.some((employee) => employee.code.toLowerCase() === code.toLowerCase())) {
      return { ok: false as const, reason: "code" as const };
    }

    const employeeId = crypto.randomUUID();
    db.employees.push({
      id: employeeId,
      code,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      teamId: input.teamId,
      officeId: db.office.id,
      active: true,
    });
    return { ok: true as const, employeeId };
  });
}

export async function updateEmployee(input: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  active: boolean;
}) {
  return update((db) => {
    const employee = db.employees.find((item) => item.id === input.employeeId);
    if (!employee) return { ok: false as const, reason: "missing" as const };
    if (!teamExists(db, input.teamId)) return { ok: false as const, reason: "team" as const };

    const email = input.email.trim().toLowerCase();
    const code = input.code.trim().toUpperCase();
    if (db.employees.some((item) => item.id !== employee.id && item.email.toLowerCase() === email)) {
      return { ok: false as const, reason: "email" as const };
    }
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      return { ok: false as const, reason: "email" as const };
    }
    if (db.employees.some((item) => item.id !== employee.id && item.code.toLowerCase() === code.toLowerCase())) {
      return { ok: false as const, reason: "code" as const };
    }

    employee.firstName = input.firstName.trim();
    employee.lastName = input.lastName.trim();
    employee.email = email;
    employee.code = code;
    employee.teamId = input.teamId;
    employee.active = input.active;
    return { ok: true as const };
  });
}

export async function createTeam(name: string) {
  return update((db) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false as const, reason: "empty" as const };
    if (db.teams.some((team) => team.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false as const, reason: "name" as const };
    }
    const team = { id: crypto.randomUUID(), name: trimmed };
    db.teams.push(team);
    return { ok: true as const, team };
  });
}

export async function renameTeam(id: string, name: string) {
  return update((db) => {
    const team = db.teams.find((item) => item.id === id);
    if (!team) return { ok: false as const, reason: "missing" as const };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false as const, reason: "empty" as const };
    if (db.teams.some((item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false as const, reason: "name" as const };
    }
    team.name = trimmed;
    return { ok: true as const };
  });
}

export async function deleteTeam(id: string) {
  return update((db) => {
    const index = db.teams.findIndex((team) => team.id === id);
    if (index < 0) return { ok: false as const, reason: "missing" as const };
    db.teams.splice(index, 1);
    for (const employee of db.employees) {
      if (employee.teamId === id) employee.teamId = null;
    }
    return { ok: true as const };
  });
}

export async function markCheckOut(input: { employeeId: string; distanceMeters: number }) {
  return update((db) => {
    const date = officeDate(db.office.timezone);
    const existing = db.attendance.find((record) => record.employeeId === input.employeeId && record.date === date);
    if (!existing) return { ok: false as const, reason: "not-in" as const };
    if (existing.checkOutAt) return { ok: false as const, reason: "already-out" as const };
    existing.checkOutAt = new Date().toISOString();
    existing.checkOutDistanceMeters = Math.round(input.distanceMeters);
    return { ok: true as const, record: existing };
  });
}
