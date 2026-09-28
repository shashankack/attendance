import { createHmac, timingSafeEqual } from "crypto";

import type { Role } from "./types";

export type Session = {
  id: string;
  role: Role;
  sid: string;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET ?? "baw-attendance-dev-secret";
}

export function signSession(input: { id: string; role: Role; sid: string }) {
  const body = Buffer.from(
    JSON.stringify({
      id: input.id,
      role: input.role,
      sid: input.sid,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (!parsed.id || !parsed.role || !parsed.sid || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
