// bench/cases.ts — the seven routes as bombardier/fetch cases
import { BASE_URL, TOKEN } from "./lib";

const ECHO = JSON.stringify({ name: "Jane Doe", email: "jane@example.com", age: 30, tags: ["a", "b"] });
const ORDER = JSON.stringify({ userId: 4242, amount: 19.99, currency: "USD" });

export interface Case {
  name: string;
  method: "GET" | "POST";
  path: string;
  headers?: Record<string, string>;
  body?: string;
  expectStatus: number;
}

export async function cases(): Promise<Case[]> {
  const auth = { authorization: `Bearer ${await TOKEN}` };
  return [
    { name: "health", method: "GET", path: "/health", expectStatus: 200 },
    { name: "echo", method: "POST", path: "/echo", headers: { "content-type": "application/json" }, body: ECHO, expectStatus: 200 },
    { name: "me", method: "GET", path: "/me", headers: auth, expectStatus: 200 },
    { name: "user", method: "GET", path: "/users/4242", expectStatus: 200 },
    { name: "list", method: "GET", path: "/users?page=7&limit=20", expectStatus: 200 },
    { name: "order", method: "POST", path: "/orders", headers: { "content-type": "application/json" }, body: ORDER, expectStatus: 201 },
    { name: "cpu", method: "GET", path: "/cpu?n=15000", expectStatus: 200 },
  ];
}

export function bombardierArgs(c: Case): string[] {
  const a: string[] = ["-m", c.method];
  for (const [k, v] of Object.entries(c.headers ?? {})) a.push("-H", `${k}: ${v}`);
  if (c.body) a.push("-b", c.body);
  a.push(`${BASE_URL}${c.path}`);
  return a;
}

// Strip fields that legitimately differ between runs.
export function normalize(name: string, body: string): string {
  if (name !== "order") return body;
  const o = JSON.parse(body);
  delete o.id;
  delete o.createdAt;
  return JSON.stringify(o);
}
