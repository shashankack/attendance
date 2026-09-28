import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cache } from "react";

import { neon, NeonDbError } from "@neondatabase/serverless";
import { revalidateTag, unstable_cache } from "next/cache";

import { arrivalStatus } from "./schedule";
import { prepareDatabase } from "./schema.mjs";
import { officeDate, officeMinutes } from "./time";
import type { Attendance, AttendanceStatus, Employee, Holiday, Office, Role, Team, User, WorkDay } from "./types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  session_token: string | null;
};

type TeamRow = { id: string; name: string };

type OfficeRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  timezone: string;
  public_ip: string;
  require_office_network: boolean;
};

type EmployeeRow = {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  team_id: string | null;
  office_id: string;
  active: boolean;
  pin_hash: string | null;
  session_token: string | null;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  office_id: string;
  date: string;
  check_in_at: Date | string;
  check_out_at: Date | string | null;
  check_in_distance_meters: number;
  check_out_distance_meters: number | null;
  status: AttendanceStatus;
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

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is missing. Add the Neon connection string in .env.local and in the Vercel project.");
  }
  return url;
}

function db() {
  return neon(databaseUrl());
}

let ready: Promise<void> | null = null;

function ensure() {
  ready ??= prepareDatabase((statement: string) => db().query(statement)).catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

function timestamp(value: Date | string | null) {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    sessionToken: row.session_token,
  };
}

function mapTeam(row: TeamRow): Team {
  return { id: row.id, name: row.name };
}

function mapOffice(row: OfficeRow): Omit<Office, "workDays" | "holidays"> {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    allowedRadiusMeters: Number(row.allowed_radius_meters),
    timezone: row.timezone,
    publicIp: row.public_ip,
    requireOfficeNetwork: row.require_office_network,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    code: row.code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    teamId: row.team_id,
    officeId: row.office_id,
    active: row.active,
    pinHash: row.pin_hash,
    sessionToken: row.session_token,
  };
}

function mapAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    officeId: row.office_id,
    date: row.date,
    checkInAt: timestamp(row.check_in_at) ?? "",
    checkOutAt: timestamp(row.check_out_at),
    checkInDistanceMeters: Number(row.check_in_distance_meters),
    checkOutDistanceMeters: row.check_out_distance_meters == null ? null : Number(row.check_out_distance_meters),
    status: row.status,
  };
}

function isUnique(error: unknown) {
  return error instanceof NeonDbError && error.code === "23505";
}

function expire(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

async function queryDirectory() {
  await ensure();
  const sql = db();
  const [teams, employees, offices, workDays, holidays] = await Promise.all([
    sql`SELECT id, name FROM teams ORDER BY name`,
    sql`SELECT id, code, first_name, last_name, email, team_id, office_id, active, pin_hash FROM employees ORDER BY first_name, last_name`,
    sql`SELECT id, name, latitude, longitude, allowed_radius_meters, timezone, public_ip, require_office_network FROM office LIMIT 1`,
    sql`SELECT weekday, working, start_minutes, end_minutes FROM work_days ORDER BY weekday`,
    sql`SELECT id, date, name FROM holidays ORDER BY date`,
  ]);
  const office = offices[0] as OfficeRow | undefined;
  if (!office) throw new Error("The office record is missing.");
  return {
    teams: (teams as TeamRow[]).map(mapTeam),
    employees: (employees as Array<Omit<EmployeeRow, "session_token">>).map((row) => mapEmployee({ ...row, session_token: null })),
    office: {
      ...mapOffice(office),
      workDays: (workDays as Array<{ weekday: number; working: boolean; start_minutes: number; end_minutes: number }>).map(
        (row): WorkDay => ({
          weekday: Number(row.weekday),
          working: row.working,
          startMinutes: Number(row.start_minutes),
          endMinutes: Number(row.end_minutes),
        }),
      ),
      holidays: (holidays as Array<{ id: string; date: string; name: string }>).map(
        (row): Holiday => ({ id: row.id, date: row.date, name: row.name }),
      ),
    },
  };
}

const loadDirectory = unstable_cache(queryDirectory, ["directory"], { tags: ["directory"], revalidate: 300 });

async function queryMonth(month: string) {
  await ensure();
  const rows = (await db()`
    SELECT id, employee_id, office_id, date, check_in_at, check_out_at, check_in_distance_meters, check_out_distance_meters, status
    FROM attendance
    WHERE date >= ${`${month}-01`} AND date <= ${`${month}-31`}
    ORDER BY date
  `) as AttendanceRow[];
  return rows.map(mapAttendance);
}

const loadMonth = unstable_cache(queryMonth, ["attendance-month"], { tags: ["attendance"], revalidate: 60 });

async function queryAdmin(id: string) {
  await ensure();
  const rows = (await db()`SELECT id, email, name, role FROM users WHERE id = ${id} LIMIT 1`) as Array<Pick<UserRow, "id" | "email" | "name" | "role">>;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

const loadAdmin = unstable_cache(queryAdmin, ["admin-profile"], { tags: ["admins"], revalidate: 3600 });

export function teamName(teams: Team[], teamId: string | null) {
  if (!teamId) return null;
  return teams.find((team) => team.id === teamId)?.name ?? null;
}

export const getDirectory = cache(() => loadDirectory());

export const getMonthAttendance = cache((month: string) => loadMonth(month));

export async function findUserByEmail(email: string) {
  await ensure();
  const sql = db();
  const rows = (await sql`SELECT id, email, name, role, password_hash, session_token FROM users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`) as UserRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export const findUserById = cache(async (id: string) => {
  const profile = await loadAdmin(id);
  if (!profile) return null;
  return { ...profile, passwordHash: "", sessionToken: null };
});

export async function sessionIsCurrent(input: { id: string; role: Role; sid: string }) {
  await ensure();
  const sql = db();
  if (input.role === "ADMIN") {
    const rows = await sql`SELECT id FROM users WHERE id = ${input.id} AND session_token = ${input.sid}`;
    return rows.length > 0;
  }
  const rows = await sql`SELECT id FROM employees WHERE id = ${input.id} AND active = true AND session_token = ${input.sid}`;
  return rows.length > 0;
}

export async function replaceSession(input: { id: string; role: Role }) {
  await ensure();
  const sid = crypto.randomUUID();
  const sql = db();
  if (input.role === "ADMIN") {
    await sql`UPDATE users SET session_token = ${sid} WHERE id = ${input.id}`;
  } else {
    await sql`UPDATE employees SET session_token = ${sid} WHERE id = ${input.id}`;
  }
  return sid;
}

export async function endSession(input: { id: string; role: Role; sid: string }) {
  await ensure();
  const sql = db();
  if (input.role === "ADMIN") {
    await sql`UPDATE users SET session_token = NULL WHERE id = ${input.id} AND session_token = ${input.sid}`;
    return;
  }
  await sql`UPDATE employees SET session_token = NULL WHERE id = ${input.id} AND session_token = ${input.sid}`;
}

export async function getOffice() {
  return (await getDirectory()).office;
}

export async function saveSchedule(input: { workDays: WorkDay[]; holidays: Array<Pick<Holiday, "date" | "name">> }) {
  await ensure();
  const sql = db();
  await sql.transaction([
    ...input.workDays.map(
      (day) => sql`
        INSERT INTO work_days (weekday, working, start_minutes, end_minutes)
        VALUES (${day.weekday}, ${day.working}, ${day.startMinutes}, ${day.endMinutes})
        ON CONFLICT (weekday) DO UPDATE
        SET working = EXCLUDED.working,
            start_minutes = EXCLUDED.start_minutes,
            end_minutes = EXCLUDED.end_minutes
      `,
    ),
    sql`DELETE FROM holidays`,
    ...input.holidays.map(
      (holiday) => sql`
        INSERT INTO holidays (id, date, name)
        VALUES (${crypto.randomUUID()}, ${holiday.date}, ${holiday.name})
      `,
    ),
  ]);
  expire("directory");
}

export async function saveOffice(next: Pick<Office, "name" | "latitude" | "longitude" | "allowedRadiusMeters" | "publicIp" | "requireOfficeNetwork">) {
  await ensure();
  const sql = db();
  const rows = (await sql`
    UPDATE office
    SET name = ${next.name},
        latitude = ${next.latitude},
        longitude = ${next.longitude},
        allowed_radius_meters = ${next.allowedRadiusMeters},
        public_ip = ${next.publicIp},
        require_office_network = ${next.requireOfficeNetwork}
    RETURNING id, name, latitude, longitude, allowed_radius_meters, timezone, public_ip, require_office_network
  `) as OfficeRow[];
  const office = rows[0];
  if (!office) throw new Error("The office record is missing.");
  expire("directory");
  return mapOffice(office);
}

export async function markCheckIn(input: { employeeId: string; distanceMeters: number }) {
  const office = await getOffice();
  const sql = db();

  const now = new Date();
  const date = officeDate(office.timezone, now);
  const status: AttendanceStatus = arrivalStatus(officeMinutes(office.timezone, now), date, office.workDays, office.holidays);
  const rows = (await sql`
    INSERT INTO attendance (
      id, employee_id, office_id, date, check_in_at, check_out_at,
      check_in_distance_meters, check_out_distance_meters, status
    )
    VALUES (
      ${crypto.randomUUID()}, ${input.employeeId}, ${office.id}, ${date}, ${now.toISOString()}, NULL,
      ${Math.round(input.distanceMeters)}, NULL, ${status}
    )
    ON CONFLICT (employee_id, date) DO NOTHING
    RETURNING id, employee_id, office_id, date, check_in_at, check_out_at, check_in_distance_meters, check_out_distance_meters, status
  `) as AttendanceRow[];
  const record = rows[0];
  if (!record) return { ok: false as const, reason: "already-in" as const };
  expire("attendance");
  return { ok: true as const, record: mapAttendance(record) };
}

export async function markCheckOut(input: { employeeId: string; distanceMeters: number }) {
  const office = await getOffice();
  const sql = db();

  const date = officeDate(office.timezone);
  const existing = (await sql`SELECT check_out_at FROM attendance WHERE employee_id = ${input.employeeId} AND date = ${date}`) as Array<{ check_out_at: Date | string | null }>;
  if (!existing[0]) return { ok: false as const, reason: "not-in" as const };
  if (existing[0].check_out_at) return { ok: false as const, reason: "already-out" as const };

  const rows = (await sql`
    UPDATE attendance
    SET check_out_at = ${new Date().toISOString()},
        check_out_distance_meters = ${Math.round(input.distanceMeters)}
    WHERE employee_id = ${input.employeeId} AND date = ${date} AND check_out_at IS NULL
    RETURNING id, employee_id, office_id, date, check_in_at, check_out_at, check_in_distance_meters, check_out_distance_meters, status
  `) as AttendanceRow[];
  const record = rows[0];
  if (!record) return { ok: false as const, reason: "already-out" as const };
  expire("attendance");
  return { ok: true as const, record: mapAttendance(record) };
}

export async function findEmployeeById(id: string) {
  const directory = await getDirectory();
  return directory.employees.find((employee) => employee.id === id) ?? null;
}

export async function attendanceInMonth(employeeId: string, month: string) {
  const rows = await getMonthAttendance(month);
  return rows.filter((row) => row.employeeId === employeeId);
}

export async function createEmployee(input: {
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  pin: string;
}) {
  await ensure();
  const sql = db();
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  if (input.teamId) {
    const teams = await sql`SELECT id FROM teams WHERE id = ${input.teamId}`;
    if (teams.length === 0) return { ok: false as const, reason: "team" as const };
  }
  const emailTaken = await sql`
    SELECT id FROM employees WHERE lower(email) = ${email}
    UNION ALL
    SELECT id FROM users WHERE lower(email) = ${email}
  `;
  if (emailTaken.length > 0) return { ok: false as const, reason: "email" as const };
  const codeTaken = await sql`SELECT id FROM employees WHERE lower(code) = ${code.toLowerCase()}`;
  if (codeTaken.length > 0) return { ok: false as const, reason: "code" as const };

  const offices = (await sql`SELECT id FROM office LIMIT 1`) as Array<{ id: string }>;
  const office = offices[0];
  if (!office) return { ok: false as const, reason: "missing" as const };

  const employeeId = crypto.randomUUID();
  try {
    await sql`
      INSERT INTO employees (id, code, first_name, last_name, email, team_id, office_id, active, pin_hash, session_token)
      VALUES (
        ${employeeId}, ${code}, ${input.firstName.trim()}, ${input.lastName.trim()}, ${email},
        ${input.teamId}, ${office.id}, true, ${hashPassword(input.pin)}, NULL
      )
    `;
  } catch (error) {
    if (!isUnique(error)) throw error;
    return { ok: false as const, reason: "email" as const };
  }
  expire("directory");
  return { ok: true as const, employeeId };
}

export async function updateEmployee(input: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  active: boolean;
  pin: string | null;
}) {
  await ensure();
  const sql = db();
  const current = await sql`SELECT id FROM employees WHERE id = ${input.employeeId}`;
  if (current.length === 0) return { ok: false as const, reason: "missing" as const };
  if (input.teamId) {
    const teams = await sql`SELECT id FROM teams WHERE id = ${input.teamId}`;
    if (teams.length === 0) return { ok: false as const, reason: "team" as const };
  }

  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  const emailTaken = await sql`
    SELECT id FROM employees WHERE id <> ${input.employeeId} AND lower(email) = ${email}
    UNION ALL
    SELECT id FROM users WHERE lower(email) = ${email}
  `;
  if (emailTaken.length > 0) return { ok: false as const, reason: "email" as const };
  const codeTaken = await sql`SELECT id FROM employees WHERE id <> ${input.employeeId} AND lower(code) = ${code.toLowerCase()}`;
  if (codeTaken.length > 0) return { ok: false as const, reason: "code" as const };

  const pinHash = input.pin ? hashPassword(input.pin) : null;
  try {
    await sql`
      UPDATE employees
      SET first_name = ${input.firstName.trim()},
          last_name = ${input.lastName.trim()},
          email = ${email},
          code = ${code},
          team_id = ${input.teamId},
          active = ${input.active},
          pin_hash = COALESCE(${pinHash}, pin_hash)
      WHERE id = ${input.employeeId}
    `;
  } catch (error) {
    if (!isUnique(error)) throw error;
    return { ok: false as const, reason: "email" as const };
  }
  expire("directory");
  return { ok: true as const };
}

export async function createTeam(name: string) {
  await ensure();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, reason: "empty" as const };
  const team = { id: crypto.randomUUID(), name: trimmed };
  try {
    await db()`INSERT INTO teams (id, name) VALUES (${team.id}, ${team.name})`;
  } catch (error) {
    if (!isUnique(error)) throw error;
    return { ok: false as const, reason: "name" as const };
  }
  expire("directory");
  return { ok: true as const, team };
}

export async function renameTeam(id: string, name: string) {
  await ensure();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, reason: "empty" as const };
  try {
    const rows = await db()`UPDATE teams SET name = ${trimmed} WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return { ok: false as const, reason: "missing" as const };
  } catch (error) {
    if (!isUnique(error)) throw error;
    return { ok: false as const, reason: "name" as const };
  }
  expire("directory");
  return { ok: true as const };
}

export async function deleteTeam(id: string) {
  await ensure();
  const rows = await db()`DELETE FROM teams WHERE id = ${id} RETURNING id`;
  if (rows.length === 0) return { ok: false as const, reason: "missing" as const };
  expire("directory");
  return { ok: true as const };
}
