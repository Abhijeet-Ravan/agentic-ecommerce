import type { NextRequest } from "next/server";
import { openFunctionCall, queue, str } from "@/lib/agni/functionKit";

type ScrollDirection = "up" | "down" | "top" | "bottom";

function direction(value: string): ScrollDirection {
  const normalized = value.trim().toLowerCase();

  if (normalized === "up" || normalized === "top") return normalized;
  if (normalized === "bottom") return "bottom";

  return "down";
}

/** Scrolls the active comparison modal, or the page when no modal is open. */
export async function POST(request: NextRequest) {
  const call = await openFunctionCall(request);

  if (!call.ok) return call.response;

  const scrollDirection = direction(str(call.args, "direction"));
  const amount = str(call.args, "amount").toLowerCase() === "page"
    ? "page"
    : "little";

  return queue(
    call.sessionId,
    { type: "scroll_view", direction: scrollDirection, amount },
    `Scrolling ${scrollDirection}${amount === "little" ? " a little" : ""}.`,
  );
}
