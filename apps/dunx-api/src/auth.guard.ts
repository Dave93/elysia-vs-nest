// A guard is middleware that throws. Applied with @UseGuards on /me only, so the
// other six routes keep the no-middleware path through the route table.
import { HttpError, HttpStatusCode, type Middleware, type Next, type RouteContext } from "@dunx/http";
import type { BunRequest } from "bun";
import { jwtVerify } from "jose";

const KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? "bench-secret-do-not-use-in-prod");

// Symbol-keyed on the request, which is the channel @dunx/http carries its own
// trace on, and the same place the Nest app puts `req.userId`.
const USER: unique symbol = Symbol.for("bench.userId");
interface Authenticated {
  [USER]?: number;
}

export const userIdOf = (req: BunRequest): number => (req as BunRequest & Authenticated)[USER]!;

export class AuthGuard implements Middleware {
  async handle(req: BunRequest, _ctx: RouteContext, next: Next): Promise<Response> {
    const header = req.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new HttpError(HttpStatusCode.UNAUTHORIZED, "unauthorized");
    try {
      const { payload } = await jwtVerify(header.slice(7), KEY, { algorithms: ["HS256"] });
      const id = Number(payload.sub);
      if (!Number.isInteger(id)) throw new Error("bad sub");
      (req as BunRequest & Authenticated)[USER] = id;
    } catch {
      throw new HttpError(HttpStatusCode.UNAUTHORIZED, "unauthorized");
    }
    return next();
  }
}
