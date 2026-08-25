"use client";

import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type TranscriptionSegment,
} from "livekit-client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { setupAgentNavigation } from "@/components/agni/setupAgentNavigation";
import {
  clearCallSessionId,
  getCallSessionId,
  isCallWidgetOpen,
  setCallSessionId,
  setCallWidgetOpen,
  useSessionId,
} from "@/lib/agni/session";

type Status = "idle" | "connecting" | "live" | "error";

type Line = {
  id: string;
  role: "agent" | "you";
  text: string;
  final: boolean;
};

const MAX_LINES = 40;

/**
 * Our own voice UI on top of the Agni web-call API: one call to our proxy for
 * LiveKit credentials, then the conversation runs over WebRTC. The session id
 * we send is what the agent's server tools use to read this tab's page context
 * and to queue actions back to the bridge.
 */
export default function AgniVoiceWidget() {
  const router = useRouter();
  const sessionId = useSessionId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const removeNavigationHandlersRef = useRef<(() => void) | null>(null);
  const startInFlightRef = useRef(false);
  const autoResumeCheckedRef = useRef(false);

  const endCall = useCallback(() => {
    removeNavigationHandlersRef.current?.();
    removeNavigationHandlersRef.current = null;
    void roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
    setOpen(false);
    setAgentSpeaking(false);
    setMuted(false);
    setCallWidgetOpen(false);
    clearCallSessionId();
  }, []);

  // Hang up if the shopper closes the tab mid-call.
  useEffect(
    () => () => {
      removeNavigationHandlersRef.current?.();
      void roomRef.current?.disconnect();
    },
    [],
  );

  const upsert = useCallback((
    segments: TranscriptionSegment[],
    participant?: Participant,
  ) => {
    const role: Line["role"] = participant?.isLocal ? "you" : "agent";

    setLines((current) => {
      const next = [...current];

      for (const segment of segments) {
        if (!segment.text.trim()) continue;

        const index = next.findIndex((line) => line.id === segment.id);
        const line: Line = {
          id: segment.id,
          role,
          text: segment.text,
          final: segment.final,
        };

        if (index >= 0) next[index] = line;
        else next.push(line);
      }

      return next.slice(-MAX_LINES);
    });
  }, []);

  const startCall = useCallback(async (resumePreviousCall = false) => {
    if (
      !sessionId ||
      startInFlightRef.current ||
      status === "connecting" ||
      status === "live"
    ) return;

    startInFlightRef.current = true;
    setStatus("connecting");
    setError("");
    setLines([]);
    setOpen(true);
    setCallWidgetOpen(true);

    try {
      const callSessionId = resumePreviousCall ? getCallSessionId() : "";
      const response = await fetch("/api/agni/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          ...(callSessionId ? { call_session_id: callSessionId } : {}),
          metadata: {
            enable_browser_navigation: true,
          },
        }),
      });
      const data: {
        livekitUrl?: string;
        accessToken?: string;
        callSessionId?: string;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.livekitUrl || !data.accessToken) {
        throw new Error(data.error ?? "Could not start the call.");
      }

      if (data.callSessionId) setCallSessionId(data.callSessionId);

      const room = new Room();
      roomRef.current = room;

      // Every handler must be attached before connect(), or the agent's
      // greeting fires with nothing listening.
      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;

          const media = track.attach();
          media.autoplay = true;
          audioRef.current?.appendChild(media);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          for (const media of track.detach()) media.remove();
        })
        .on(RoomEvent.TranscriptionReceived, upsert)
        .on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try {
            const message: { text?: string; sender?: string } = JSON.parse(
              new TextDecoder().decode(payload),
            );

            const text = message.text;

            if (!text) return;

            const role: Line["role"] = message.sender === "user" ? "you" : "agent";

            setLines((current) =>
              [
                ...current,
                { id: `data-${current.length}-${text}`, role, text, final: true },
              ].slice(-MAX_LINES),
            );
          } catch {
            /* not a JSON message — ignore */
          }
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
          setAgentSpeaking(speakers.some((speaker) => !speaker.isLocal)),
        )
        .on(RoomEvent.Disconnected, () => {
          removeNavigationHandlersRef.current?.();
          removeNavigationHandlersRef.current = null;
          roomRef.current = null;
          setStatus("idle");
          setAgentSpeaking(false);
        });

      await room.connect(data.livekitUrl, data.accessToken);
      removeNavigationHandlersRef.current = setupAgentNavigation(room, router);
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("live");
    } catch (cause) {
      removeNavigationHandlersRef.current?.();
      removeNavigationHandlersRef.current = null;
      void roomRef.current?.disconnect();
      roomRef.current = null;
      setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "Could not start the call.",
      );
    } finally {
      startInFlightRef.current = false;
    }
  }, [router, sessionId, status, upsert]);

  // Product links open a fresh tab. If the previous tab had the call widget
  // open, reconnect immediately and ask create-call to continue that call.
  useEffect(() => {
    if (!sessionId || autoResumeCheckedRef.current) return;

    autoResumeCheckedRef.current = true;

    if (isCallWidgetOpen() && getCallSessionId()) {
      void startCall(true);
    }
  }, [sessionId, startCall]);

  function closeWidget() {
    setOpen(false);
    setCallWidgetOpen(false);
  }

  function showWidget() {
    setOpen(true);
    setCallWidgetOpen(true);
  }

  async function toggleMute() {
    const room = roomRef.current;

    if (!room) return;

    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  if (!sessionId) return null;

  const live = status === "live";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div ref={audioRef} className="hidden" />

      {open && (
        <section className="w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  live
                    ? agentSpeaking
                      ? "animate-pulse bg-red-600"
                      : "bg-green-600"
                    : "bg-gray-400"
                }`}
              />
              <p className="text-sm font-semibold">
                {status === "connecting"
                  ? "Connecting…"
                  : live
                    ? agentSpeaking
                      ? "Assistant is speaking"
                      : "Listening"
                    : "Shopping assistant"}
              </p>
            </div>
            <button
              onClick={closeWidget}
              aria-label="Close assistant"
              className="text-lg leading-none text-gray-500"
            >
              ×
            </button>
          </header>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {error && <p className="text-red-600">{error}</p>}

            {!error && !lines.length && (
              <p className="text-gray-500">
                {live
                  ? "Say what you're looking for — a brand, a style, a colour."
                  : "Start a call and tell the assistant what you want to buy."}
              </p>
            )}

            {lines.map((line) => (
              <p key={line.id} className={line.role === "you" ? "text-right" : ""}>
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                  {line.role}
                </span>
                <span className={line.final ? "" : "text-gray-500"}>{line.text}</span>
              </p>
            ))}
          </div>

          <footer className="flex gap-2 border-t border-gray-200 px-4 py-3">
            {live ? (
              <>
                <button
                  onClick={() => void toggleMute()}
                  className="flex-1 rounded border border-gray-300 py-2 text-sm font-semibold"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={endCall}
                  className="flex-1 rounded bg-red-600 py-2 text-sm font-semibold text-white"
                >
                  End call
                </button>
              </>
            ) : (
              <button
                onClick={() => void startCall(false)}
                disabled={status === "connecting"}
                className="w-full rounded bg-black py-2 text-sm font-semibold text-white disabled:bg-gray-400"
              >
                {status === "connecting" ? "Connecting…" : "Start call"}
              </button>
            )}
          </footer>
        </section>
      )}

      <button
        onClick={() => {
          if (open) closeWidget();
          else if (status === "live" || status === "connecting") showWidget();
          else void startCall(false);
        }}
        className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <span aria-hidden>{live ? "🔴" : "🎙"}</span>
        {live ? "On call" : "Shop by voice"}
      </button>
    </div>
  );
}
