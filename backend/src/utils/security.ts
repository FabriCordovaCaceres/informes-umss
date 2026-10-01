import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return (
    expected.length === candidate.length && timingSafeEqual(candidate, expected)
  );
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const sessionToken = () => randomBytes(32).toString("hex");
