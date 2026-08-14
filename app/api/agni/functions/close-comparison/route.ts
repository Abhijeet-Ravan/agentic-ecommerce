import type { NextRequest } from "next/server";
import { openFunctionCall, queue } from "@/lib/agni/functionKit";

/** Dismisses the comparison without selecting a product or changing the cart. */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  return queue(
    call.sessionId,
    { type: "close_comparison" },
    "Closing the comparison now. The products and cart are unchanged.",
  );
}
