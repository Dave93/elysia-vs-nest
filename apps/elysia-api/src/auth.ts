import { jwtVerify } from "jose";

const KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? "bench-secret-do-not-use-in-prod");

export async function userIdFromAuthHeader(h: string | undefined): Promise<number | null> {
  if (!h?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(h.slice(7), KEY, { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
