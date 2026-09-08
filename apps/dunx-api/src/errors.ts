// The fixture's 401 and 404 bodies are `{"error":"..."}` with nothing else, which
// is what Nest's `UnauthorizedException({ error })` and Elysia's
// `status(401, { error })` answer with. dunx's mapper adds `status`, so this
// narrows those two back. It runs on the error path only and costs the seven
// measured routes nothing; everything else, validation issues included, keeps the
// default body.
import { defaultErrorMapper, HttpError, HttpStatusCode, type ErrorMapper } from "@dunx/http";

const BARE: ReadonlySet<number> = new Set([HttpStatusCode.UNAUTHORIZED, HttpStatusCode.NOT_FOUND]);

export const errorMapper: ErrorMapper = (error, req) =>
  error instanceof HttpError && BARE.has(error.status)
    ? Response.json({ error: error.message }, { status: error.status })
    : defaultErrorMapper(error, req);
