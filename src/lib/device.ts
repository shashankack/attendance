const PREFIX = "baw.device.";

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readDeviceSecret(employeeId: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${PREFIX}${employeeId}`) ?? "";
  } catch {
    return "";
  }
}

export function ensureDeviceSecret(employeeId: string) {
  if (typeof window === "undefined") return "";
  const existing = readDeviceSecret(employeeId);
  if (existing.length >= 32) return existing;
  const secret = randomSecret();
  try {
    window.localStorage.setItem(`${PREFIX}${employeeId}`, secret);
  } catch {
    return secret;
  }
  return secret;
}
