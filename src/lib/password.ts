import { compare, hash } from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}

export async function verifyPassword(plain: string, digest: string): Promise<boolean> {
  return compare(plain, digest);
}
