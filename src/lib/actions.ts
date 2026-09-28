"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { distanceMeters } from "./geo";
import { readSession, signSession } from "./session";
import {
  createEmployee,
  createTeam,
  deleteTeam,
  findEmployeeById,
  findUserByEmail,
  endSession,
  findUserById,
  getOffice,
  markCheckIn,
  markCheckOut,
  renameTeam,
  replaceSession,
  saveOffice,
  saveSchedule,
  sessionIsCurrent,
  updateEmployee,
  verifyPassword,
} from "./store";
import { filledWorkDays, weekdayNames } from "./schedule";
import type { Holiday, PublicUser, WorkDay } from "./types";

export type ActionResult = { ok: true } | { ok: false; message: string };

function publicUser(user: { id: string; email: string; name: string; role: PublicUser["role"] }): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

const requestSession = cache(async () => {
  const jar = await cookies();
  return readSession(jar.get("session")?.value);
});

export async function currentUser() {
  const session = await requestSession();
  if (!session || session.role !== "ADMIN") return null;
  const user = await findUserById(session.id);
  if (!user) return null;
  return publicUser(user);
}

export async function currentEmployee(options?: { live?: boolean }) {
  const session = await requestSession();
  if (!session || session.role !== "EMPLOYEE") return null;
  if (options?.live && !(await sessionIsCurrent(session))) return null;
  const employee = await findEmployeeById(session.id);
  if (!employee || !employee.active) return null;
  return employee;
}

async function liveAdmin() {
  const session = await requestSession();
  if (!session || session.role !== "ADMIN" || !(await sessionIsCurrent(session))) return null;
  const user = await findUserById(session.id);
  if (!user) return null;
  return publicUser(user);
}

function validPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}

export async function login(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await findUserByEmail(email);

  if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "That admin email and password do not match." };
  }

  const jar = await cookies();
  const sid = await replaceSession({ id: user.id, role: "ADMIN" });
  jar.set("session", signSession({ id: user.id, role: "ADMIN", sid }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function sessionAlive() {
  const jar = await cookies();
  const session = await requestSession();
  if (!session || !(await sessionIsCurrent(session))) {
    if (session) jar.delete("session");
    return false;
  }
  return true;
}

export async function signInEmployee(employeeId: string, pin: string): Promise<ActionResult> {
  const employee = await findEmployeeById(employeeId);
  if (!employee || !employee.active) return { ok: false, message: "That person cannot sign in." };
  if (!employee.pinHash) return { ok: false, message: "Ask an admin to set your sign-in PIN." };
  if (!verifyPassword(pin, employee.pinHash)) return { ok: false, message: "That PIN does not match." };

  const jar = await cookies();
  const sid = await replaceSession({ id: employee.id, role: "EMPLOYEE" });
  jar.set("session", signSession({ id: employee.id, role: "EMPLOYEE", sid }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/me");
}

export async function logout() {
  const jar = await cookies();
  const session = readSession(jar.get("session")?.value);
  if (session) await endSession(session);
  jar.delete("session");
  redirect("/");
}

async function requireAdmin() {
  const user = await liveAdmin();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

async function clientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

function isPublicAddress(ip: string) {
  if (!ip || ip === "::1") return false;
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    return !lower.startsWith("fe80") && !lower.startsWith("fc") && !lower.startsWith("fd");
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return a >= 1 && a <= 223;
}

async function wifiBlock() {
  const office = await getOffice();
  if (!office.requireOfficeNetwork) return null;
  const ip = await clientIp();
  if (!office.publicIp || ip !== office.publicIp) {
    return "Connect to the office Wi-Fi before marking attendance.";
  }
  return null;
}

export async function officeWifi(): Promise<{ ok: true; ip: string; seenByServer: boolean } | { ok: false; message: string }> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can read the office Wi-Fi." };
  const ip = await clientIp();
  if (isPublicAddress(ip)) return { ok: true, ip, seenByServer: true };
  return { ok: true, ip: "", seenByServer: false };
}

export async function onOfficeWifi() {
  const office = await getOffice();
  if (!office.requireOfficeNetwork) return true;
  const ip = await clientIp();
  return Boolean(office.publicIp) && ip === office.publicIp;
}

function locationError(distance: number, radius: number) {
  return `You are ${Math.round(distance)} m from the office. Marking is allowed within ${radius} m.`;
}

export async function checkIn(input: {
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const employee = await currentEmployee({ live: true });
  if (!employee) return { ok: false, message: "Sign in before marking attendance." };
  const office = await getOffice();

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, message: "A location reading is required." };
  }

  if (input.accuracy > office.allowedRadiusMeters) {
    return {
      ok: false,
      message: `This GPS reading is only accurate to about ${Math.round(input.accuracy)} m. Wait for a sharper fix, then try again.`,
    };
  }

  const distance = distanceMeters(input.latitude, input.longitude, office.latitude, office.longitude);
  if (distance > office.allowedRadiusMeters) {
    return { ok: false, message: locationError(distance, office.allowedRadiusMeters) };
  }

  const blocked = await wifiBlock();
  if (blocked) return { ok: false, message: blocked };

  const result = await markCheckIn({ employeeId: employee.id, distanceMeters: distance });
  if (!result.ok) return { ok: false, message: "Attendance is already marked for today." };
  return { ok: true };
}

export async function checkOut(input: {
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const employee = await currentEmployee({ live: true });
  if (!employee) return { ok: false, message: "Sign in before marking attendance." };
  const office = await getOffice();

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, message: "A location reading is required." };
  }

  const distance = distanceMeters(input.latitude, input.longitude, office.latitude, office.longitude);

  if (input.accuracy > office.allowedRadiusMeters) {
    return {
      ok: false,
      message: `This GPS reading is only accurate to about ${Math.round(input.accuracy)} m. Wait for a sharper fix, then try again.`,
    };
  }

  if (distance > office.allowedRadiusMeters) {
    return { ok: false, message: locationError(distance, office.allowedRadiusMeters) };
  }

  const blocked = await wifiBlock();
  if (blocked) return { ok: false, message: blocked };

  const result = await markCheckOut({ employeeId: employee.id, distanceMeters: distance });
  if (!result.ok && result.reason === "not-in") {
    return { ok: false, message: "Check in before checking out." };
  }
  if (!result.ok) return { ok: false, message: "You have already checked out today." };
  return { ok: true };
}

export async function updateOffice(input: {
  name: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  publicIp: string;
  requireOfficeNetwork: boolean;
}): Promise<ActionResult> {
  const user = await liveAdmin();
  if (!user || user.role !== "ADMIN") return { ok: false, message: "Only an admin can change the office." };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "The office needs a name." };
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return { ok: false, message: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return { ok: false, message: "Longitude must be between -180 and 180." };
  }
  if (!Number.isInteger(input.allowedRadiusMeters) || input.allowedRadiusMeters < 25 || input.allowedRadiusMeters > 5000) {
    return { ok: false, message: "Radius must be a whole number from 25 to 5000 meters." };
  }

  await saveOffice({
    name,
    latitude: input.latitude,
    longitude: input.longitude,
    allowedRadiusMeters: input.allowedRadiusMeters,
    publicIp: input.publicIp.trim(),
    requireOfficeNetwork: input.requireOfficeNetwork,
  });
  return { ok: true };
}

export async function updateSchedule(input: {
  workDays: WorkDay[];
  holidays: Array<Pick<Holiday, "date" | "name">>;
}): Promise<ActionResult> {
  if (!(await liveAdmin())) return { ok: false, message: "Only an admin can change the schedule." };

  const workDays = filledWorkDays(input.workDays);
  if (!workDays.some((day) => day.working)) {
    return { ok: false, message: "Choose at least one working day." };
  }
  for (const day of workDays) {
    if (
      !Number.isInteger(day.startMinutes) ||
      !Number.isInteger(day.endMinutes) ||
      day.startMinutes < 0 ||
      day.endMinutes < 0 ||
      day.startMinutes > 1439 ||
      day.endMinutes > 1439
    ) {
      return { ok: false, message: `Enter hours for ${weekdayNames[day.weekday]}.` };
    }
    if (day.working && day.endMinutes <= day.startMinutes) {
      return { ok: false, message: `${weekdayNames[day.weekday]} must end after it starts.` };
    }
  }

  const holidays = input.holidays.map((holiday) => ({ date: holiday.date.trim(), name: holiday.name.trim() }));
  const seen = new Set<string>();
  for (const holiday of holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) return { ok: false, message: "Enter a holiday date." };
    if (!holiday.name || holiday.name.length > 80) return { ok: false, message: "A holiday needs a name of up to 80 characters." };
    if (seen.has(holiday.date)) return { ok: false, message: "That date is already a holiday." };
    seen.add(holiday.date);
  }

  await saveSchedule({ workDays, holidays });
  return { ok: true };
}

function employeeMessage(reason: "email" | "code" | "missing" | "team") {
  if (reason === "email") return "That email is already in use.";
  if (reason === "code") return "That employee code is already in use.";
  if (reason === "team") return "Choose a team from the list, or leave the person without one.";
  return "That employee no longer exists.";
}

export async function addEmployee(input: {
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  pin: string;
}): Promise<ActionResult & { employeeId?: string }> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can add employees." };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.code.trim()) {
    return { ok: false, message: "Name and employee code are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { ok: false, message: "Enter a valid email." };
  }
  if (!validPin(input.pin)) return { ok: false, message: "The sign-in PIN must be 4 to 8 digits." };

  const result = await createEmployee(input);
  if (!result.ok) return { ok: false, message: employeeMessage(result.reason) };
  return { ok: true, employeeId: result.employeeId };
}

export async function editEmployee(input: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  teamId: string | null;
  active: boolean;
  pin: string;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can edit employees." };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.code.trim()) {
    return { ok: false, message: "Name and employee code are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { ok: false, message: "Enter a valid email." };
  }
  const pin = input.pin.trim();
  if (pin && !validPin(pin)) return { ok: false, message: "The sign-in PIN must be 4 to 8 digits." };

  const result = await updateEmployee({ ...input, pin: pin || null });
  if (!result.ok) return { ok: false, message: employeeMessage(result.reason) };
  return { ok: true };
}

function teamMessage(reason: "empty" | "name" | "missing") {
  if (reason === "empty") return "A team needs a name.";
  if (reason === "name") return "A team with that name already exists.";
  return "That team no longer exists.";
}

export async function addTeam(name: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can add teams." };
  const result = await createTeam(name);
  if (!result.ok) return { ok: false, message: teamMessage(result.reason) };
  return { ok: true };
}

export async function editTeam(id: string, name: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can rename teams." };
  const result = await renameTeam(id, name);
  if (!result.ok) return { ok: false, message: teamMessage(result.reason) };
  return { ok: true };
}

export async function removeTeam(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can delete teams." };
  const result = await deleteTeam(id);
  if (!result.ok) return { ok: false, message: teamMessage(result.reason) };
  return { ok: true };
}
