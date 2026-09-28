import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { Attendance, AttendanceStatus, Database, Employee, Office, User } from "./types";
import { officeDate, officeMinutes } from "./time";

const START_MINUTES = 10 * 60;
const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "db.json");

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

  const people: Array<Omit<User, "passwordHash"> & Omit<Employee, "id" | "userId" | "officeId">> = [
    {
      id: crypto.randomUUID(),
      email: "admin@baw.dev",
      name: "Priya Shah",
      role: "ADMIN",
      code: "ADM-001",
      firstName: "Priya",
      lastName: "Shah",
      department: "People",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "arun@baw.dev",
      name: "Arun Mehta",
      role: "EMPLOYEE",
      code: "EMP-014",
      firstName: "Arun",
      lastName: "Mehta",
      department: "Engineering",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "meera@baw.dev",
      name: "Meera Iyer",
      role: "EMPLOYEE",
      code: "EMP-021",
      firstName: "Meera",
      lastName: "Iyer",
      department: "Engineering",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "kabir@baw.dev",
      name: "Kabir Das",
      role: "EMPLOYEE",
      code: "EMP-033",
      firstName: "Kabir",
      lastName: "Das",
      department: "Design",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "sara@baw.dev",
      name: "Sara Khan",
      role: "EMPLOYEE",
      code: "EMP-040",
      firstName: "Sara",
      lastName: "Khan",
      department: "Product",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "dev@baw.dev",
      name: "Dev Patel",
      role: "EMPLOYEE",
      code: "EMP-018",
      firstName: "Dev",
      lastName: "Patel",
      department: "Engineering",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      email: "neel@baw.dev",
      name: "Neel Joshi",
      role: "EMPLOYEE",
      code: "EMP-052",
      firstName: "Neel",
      lastName: "Joshi",
      department: "Sales",
      active: true,
    },
  ];

  const users: User[] = people.map((person) => ({
    id: person.id,
    email: person.email,
    name: person.name,
    role: person.role,
    passwordHash: hashPassword("password"),
  }));

  const employees: Employee[] = people
    .filter((person) => person.role === "EMPLOYEE")
    .map((person) => ({
      id: crypto.randomUUID(),
      userId: person.id,
      code: person.code,
      firstName: person.firstName,
      lastName: person.lastName,
      department: person.department,
      officeId: office.id,
      active: true,
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

  return { users, employees, office, attendance };
}

function read(): Database {
  try {
    return JSON.parse(readFileSync(dataFile, "utf8")) as Database;
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

export function findUserByEmail(email: string) {
  return read().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findUserById(id: string) {
  return read().users.find((user) => user.id === id) ?? null;
}

export function findEmployeeByUserId(userId: string) {
  return read().employees.find((employee) => employee.userId === userId) ?? null;
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

export async function markCheckIn(input: {
  employeeId: string;
  distanceMeters: number;
}) {
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
