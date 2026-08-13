import type { NextRequest } from "next/server";
import { requireAgniSecret } from "@/lib/agni/auth";
import { drainActions, enqueueAction, recordResults } from "@/lib/agni/store";
import { parseAction, type ActionResult } from "@/lib/agni/types";

function sessionIdOf(payload: Record<string, unknown>) {
  return typeof payload.session_id === "string" ? payload.session_id.trim() : "";
}

/**
 * Generic action queue behind the named functions in `functions/`. The dev
 * console posts here directly; in production it is secret-gated like the rest.
 */
export async function POST(request: NextRequest) {
  const denied = requireAgniSecret(request);

  if (denied) return denied;

  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const sessionId = sessionIdOf(payload);

  if (!sessionId) {
    return Response.json({ error: "session_id is required." }, { status: 400 });
  }

  const parsed = parseAction(payload);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const queued = enqueueAction(sessionId, parsed.action);

  return Response.json({ ok: true, action_id: queued.id });
}

/** The in-page bridge drains its queue. */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sid")?.trim();

  if (!sessionId) {
    return Response.json({ error: "sid is required." }, { status: 400 });
  }

  return Response.json({ actions: drainActions(sessionId) });
}

/** The bridge reports what happened, so the agent can speak about outcomes. */
export async function PUT(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const sessionId = sessionIdOf(payload);

  if (!sessionId) {
    return Response.json({ error: "session_id is required." }, { status: 400 });
  }

  const results = Array.isArray(payload.results)
    ? (payload.results as ActionResult[]).filter(
        (result) => result && typeof result.type === "string",
      )
    : [];

  recordResults(sessionId, results);

  return Response.json({ ok: true });
}
