import type { NextRequest } from "next/server";
import { requireAgniSecret } from "@/lib/agni/auth";
import { enqueueAction } from "@/lib/agni/store";
import type { AgniAction } from "@/lib/agni/types";

/**
 * Shared plumbing for the agent's custom functions. Every endpoint under
 * `app/api/agni/functions/` opens with `openFunctionCall`, then answers with
 * `ok`/`fail` — never a 4xx, because a non-200 reads to the agent as a tool
 * failure and it apologises vaguely instead of relaying our message.
 */
export type FunctionCall =
  | { ok: true; sessionId: string; args: Record<string, unknown> }
  | { ok: false; response: Response };

export async function openFunctionCall(request: NextRequest): Promise<FunctionCall> {
  const denied = requireAgniSecret(request);

  if (denied) return { ok: false, response: denied };

  const body: unknown = await request.json().catch(() => null);
  const args =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  // The argument is the transport that works: the agent reads the id out of its
  // prompt, where `{{session_id}}` was substituted at call creation. Query and
  // header forms are kept for the bridge and for manual testing.
  const sessionId = cleanSessionId(
    str(args, "session_id", "sid") ||
      request.nextUrl.searchParams.get("sid") ||
      request.headers.get("x-agni-session-id") ||
      "",
  );

  if (!sessionId) {
    return {
      ok: false,
      response: fail(
        "I've lost track of which browser tab you're shopping in. Ask the shopper to reload the store page.",
      ),
    };
  }

  return { ok: true, sessionId, args };
}

/**
 * Dynamic variables are substituted in the prompt, never inside function config,
 * so a templated `?sid={{session_id}}` would arrive literally. Treat that as
 * absent — otherwise we key a session on the placeholder and report "no context"
 * for a reason unrelated to the real problem. Capped at 128 like the proxy: this
 * value reaches an LLM prompt.
 */
export function cleanSessionId(value: string) {
  const trimmed = value.trim().slice(0, 128);

  return trimmed.includes("{{") || trimmed.includes("}}") ? "" : trimmed;
}

export function ok(summary: string, data: Record<string, unknown> = {}) {
  return Response.json({ ok: true, summary, ...data });
}

export function fail(summary: string, data: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: summary, summary, ...data });
}

/** Queues an action for the shopper's browser and reports it in speakable form. */
export function queue(
  sessionId: string,
  action: AgniAction,
  summary: string,
  data: Record<string, unknown> = {},
) {
  return queueAll(sessionId, [action], summary, data);
}

/**
 * Queues several actions to run back to back. The bridge drains the whole queue
 * in one poll, so chaining here costs a fraction of a second — where a second
 * tool call would cost the agent another round trip and leave the shopper
 * listening to silence.
 */
export function queueAll(
  sessionId: string,
  actions: AgniAction[],
  summary: string,
  data: Record<string, unknown> = {},
) {
  const ids = actions.map((action) => enqueueAction(sessionId, action).id);

  return ok(summary, { ...data, action_ids: ids });
}

export function str(args: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

/** Voice models send numbers as strings ("size": "8") more often than not. */
export function num(args: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = args[name];

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

export function list(values: Array<string | number>) {
  if (values.length <= 1) return values.join("");
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

export function money(amount: number) {
  return `${amount.toLocaleString("en-US")} taka`;
}
