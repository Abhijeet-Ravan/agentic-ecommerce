import type { NextRequest } from "next/server";
import { fail, ok, openFunctionCall } from "@/lib/agni/functionKit";
import { getContext } from "@/lib/agni/store";

/**
 * `get_page_context` — what the shopper is looking at right now.
 * Register with `speakAfterExecution: false`; the block is for reading, not
 * reciting.
 */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const stored = getContext(call.sessionId);

  if (!stored) {
    // The page re-pushes within a poll of noticing this, so a retry almost
    // always succeeds. Asking the shopper to reload is a last resort.
    return fail(
      "Nothing reported for this session yet — the page is being asked to send it now. Keep talking, wait a moment and call get_page_context again. Only if it fails twice more, ask them to reload the store.",
    );
  }

  return ok("Page context retrieved.", {
    context: stored.context,
    updated_at: new Date(stored.contextAt).toISOString(),
  });
}
