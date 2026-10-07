import "server-only";
import { randomInt } from "node:crypto";

/** Readable temporary password (no look-alike characters), e.g. "Kp7m-Qx4t-Zr9w" */
export function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}
