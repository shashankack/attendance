"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { distanceMeters } from "./geo";
import { readSession, signSession } from "./session";
import {
  createEmployee,
  createTeam,
  deleteTeam,
  findEmployeeById,
  findUserByEmail,
  findUserById,
  getOffice,
  markCheckIn,
  markCheckOut,
  renameTeam,
  saveOffice,
  updateEmployee,
  verifyPassword,
} from "./store";
import type { PublicUser } from "./types";

export type ActionResult = { ok: true } | { ok: false; message: string };

function publicUser(user: { id: string; email: string; name: string; role: PublicUser["role"] }): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function currentUser() {
  const jar = await cookies();
  const session = readSession(jar.get("session")?.value);
  if (!session) return null;
  const user = findUserById(session.id);
  if (!user) return null;
  return publicUser(user);
}

export async function login(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = findUserByEmail(email);

  if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "That admin email and password do not match." };
  }

  const jar = await cookies();
  jar.set("session", signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  jar.delete("session");
  redirect("/");
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

async function clientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "";
}

function locationError(distance: number, radius: number) {
  return `You are ${Math.round(distance)} m from the office. Check-in is allowed within ${radius} m.`;
}

export async function checkIn(input: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const employee = findEmployeeById(input.employeeId);
  if (!employee || !employee.active) return { ok: false, message: "That person is not on the desk." };
  const office = getOffice();

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

  if (office.requireOfficeNetwork) {
    const ip = await clientIp();
    if (!office.publicIp || ip !== office.publicIp) {
      return { ok: false, message: "This request is not coming from the office network." };
    }
  }

  const result = await markCheckIn({ employeeId: employee.id, distanceMeters: distance });
  if (!result.ok) return { ok: false, message: "You have already checked in today." };
  return { ok: true };
}

export async function checkOut(input: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const employee = findEmployeeById(input.employeeId);
  if (!employee || !employee.active) return { ok: false, message: "That person is not on the desk." };
  const office = getOffice();
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
  const user = await currentUser();
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
}): Promise<ActionResult & { employeeId?: string }> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can add employees." };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.code.trim()) {
    return { ok: false, message: "Name and employee code are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { ok: false, message: "Enter a valid email." };
  }

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
}): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Only an admin can edit employees." };
  if (!input.firstName.trim() || !input.lastName.trim() || !input.code.trim()) {
    return { ok: false, message: "Name and employee code are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { ok: false, message: "Enter a valid email." };
  }

  const result = await updateEmployee(input);
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
