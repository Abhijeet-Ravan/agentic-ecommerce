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
    return fail(
      "The shopper's browser hasn't reported a page yet. Ask them to reload the store.",
    );
  }

  return ok("Page context retrieved.", {
    context: stored.context,
    updated_at: new Date(stored.contextAt).toISOString(),
  });
}
