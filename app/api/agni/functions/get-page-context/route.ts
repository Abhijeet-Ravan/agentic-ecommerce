import type { NextRequest } from "next/server";
import { fail, ok, openFunctionCall } from "@/lib/agni/functionKit";
import { getActionState, getContext } from "@/lib/agni/store";

const ACTION_SETTLE_TIMEOUT_MS = 2400;
const ACTION_SETTLE_POLL_MS = 120;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function settledContext(sessionId: string) {
  const deadline = Date.now() + ACTION_SETTLE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const stored = getContext(sessionId);
    const action = getActionState(sessionId);
    const contextCaughtUp = !action.resultAt ||
      (stored?.contextAt ?? 0) >= action.resultAt;

    if (!action.pending && contextCaughtUp) {
      return { stored, pending: false };
    }

    await wait(ACTION_SETTLE_POLL_MS);
  }

  return { stored: getContext(sessionId), pending: true };
}

/**
 * `get_page_context` — what the shopper is looking at right now.
 * Register with `speakAfterExecution: false`; the block is for reading, not
 * reciting.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const { stored, pending } = await settledContext(call.sessionId);

  if (!stored) {
    // The page re-pushes within a poll of noticing this, so a retry almost
    // always succeeds. Asking the shopper to reload is a last resort.
    return fail(
      "Nothing reported for this session yet — the page is being asked to send it now. Keep talking, wait a moment and call get_page_context again. Only if it fails twice more, ask them to reload the store.",
    );
  }

  if (pending) {
    return fail(
      "The browser is still applying the last action. Do not claim the page changed yet. Keep talking briefly, then call get_page_context again.",
      {
        context: stored.context,
        updated_at: new Date(stored.contextAt).toISOString(),
        action_pending: true,
      },
    );
  }

  return ok("Page context retrieved.", {
    context: stored.context,
    updated_at: new Date(stored.contextAt).toISOString(),
  });
}
