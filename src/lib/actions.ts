"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { distanceMeters } from "./geo";
import { readSession, signSession } from "./session";
import {
  findEmployeeByUserId,
  findUserByEmail,
  findUserById,
  getOffice,
  markCheckIn,
  markCheckOut,
  saveOffice,
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

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "That email and password do not match." };
  }

  const jar = await cookies();
  jar.set("session", signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(user.role === "ADMIN" ? "/admin" : "/me");
}

export async function logout() {
  const jar = await cookies();
  jar.delete("session");
  redirect("/");
}

async function requireEmployee() {
  const user = await currentUser();
  if (!user || user.role !== "EMPLOYEE") redirect("/");
  const employee = findEmployeeByUserId(user.id);
  if (!employee) redirect("/");
  return { user, employee };
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
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const { employee } = await requireEmployee();
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
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<ActionResult> {
  const { employee } = await requireEmployee();
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
