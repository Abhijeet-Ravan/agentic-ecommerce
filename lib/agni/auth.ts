import type { NextRequest } from "next/server";

/**
 * Agni calls our function endpoints server-to-server, so there is no cookie and
 * no session — a shared secret header is the only thing separating a real call
 * from a forged one. Returns null when authorised, or the response to send.
 *
 * 404 rather than 401: don't confirm the route exists to an unauthenticated
 * prober. Fails closed in production if the secret was never set.
 */
export function requireAgniSecret(request: NextRequest) {
  const expected = process.env.AGNI_ACTION_SECRET;

  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? Response.json({ error: "Not found" }, { status: 404 })
      : null; // local dev convenience only
  }

  return request.headers.get("x-agni-action-secret") === expected
    ? null
    : Response.json({ error: "Not found" }, { status: 404 });
}
