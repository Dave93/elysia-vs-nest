import { createHash } from "node:crypto";

export function sha256Loop(n: number): string {
  let h = "elysia-vs-nest";
  for (let i = 0; i < n; i++) h = createHash("sha256").update(h).digest("hex");
  return h;
}
