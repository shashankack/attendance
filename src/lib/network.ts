/** First two IPv4 octets — typical Indian dynamic ISP block (/16). */
export function ipv4Prefix16(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return `${octets[0]}.${octets[1]}`;
}

/** Exact match, or same /16 when the office ISP reassigns the public address. */
export function ipMatchesOffice(clientIp: string, officeIp: string) {
  if (!clientIp || !officeIp) return false;
  if (clientIp === officeIp) return true;
  const clientPrefix = ipv4Prefix16(clientIp);
  const officePrefix = ipv4Prefix16(officeIp);
  return Boolean(clientPrefix && officePrefix && clientPrefix === officePrefix);
}
