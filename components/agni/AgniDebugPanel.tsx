"use client";

import { useState } from "react";
import { useSessionId } from "@/lib/agni/session";

const PRESETS: Array<{ label: string; action: Record<string, unknown> }> = [
  { label: "Search “sneaker”", action: { type: "search_products", query: "sneaker" } },
  { label: "Brand: North Star", action: { type: "search_products", brand: "North Star" } },
  {
    label: "Open canvas shoe",
    action: { type: "open_product", slug: "north-star-canvas-shoe" },
  },
  { label: "Colour: blue", action: { type: "select_color", color: "Blue" } },
  { label: "Size 8", action: { type: "select_size", size: 8 } },
  { label: "Add to cart (size 8)", action: { type: "add_to_cart", size: 8 } },
  { label: "Open cart", action: { type: "open_cart" } },
  { label: "Checkout", action: { type: "checkout" } },
];

/**
 * Dev-only console (`NEXT_PUBLIC_AGNI_DEBUG=1`). It POSTs to the same endpoint
 * the agent's server tools use, so the whole loop can be exercised before the
 * voice agent is provisioned.
 */
export default function AgniDebugPanel() {
  const sessionId = useSessionId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('{ "type": "search_products", "query": "sandal" }');
  const [log, setLog] = useState<string[]>([]);

  async function send(action: Record<string, unknown>) {
    try {
      const response = await fetch("/api/agni/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...action }),
      });
      const data = await response.json();

      setLog((entries) =>
        [`${action.type as string} → ${response.status} ${JSON.stringify(data)}`, ...entries].slice(0, 6),
      );
    } catch (error) {
      setLog((entries) => [`failed: ${String(error)}`, ...entries].slice(0, 6));
    }
  }

  async function showContext() {
    const response = await fetch(`/api/agni/context?sid=${encodeURIComponent(sessionId)}`);
    console.log(await response.text());
    setLog((entries) => ["context printed to the console", ...entries].slice(0, 6));
  }

  if (!sessionId) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm text-xs">
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded bg-black px-3 py-2 font-semibold text-white"
      >
        Agni console {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="break-all text-gray-500">session: {sessionId}</p>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => void send(preset.action)}
                className="rounded border border-gray-300 px-2 py-1"
              >
                {preset.label}
              </button>
            ))}
            <button onClick={() => void showContext()} className="rounded border border-gray-300 px-2 py-1">
              Print context
            </button>
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="w-full rounded border border-gray-300 p-2 font-mono"
          />
          <button
            onClick={() => {
              try {
                void send(JSON.parse(draft));
              } catch {
                setLog((entries) => ["invalid JSON", ...entries].slice(0, 6));
              }
            }}
            className="w-full rounded bg-black px-3 py-2 font-semibold text-white"
          >
            Queue action
          </button>

          {log.length > 0 && (
            <ul className="space-y-1 text-gray-600">
              {log.map((entry, index) => (
                <li key={index} className="break-all">
                  {entry}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
