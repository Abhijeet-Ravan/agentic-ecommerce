"use client";

import {
  ConnectionState,
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
import { useCart } from "@/context/CartContext";
import { safeInternalRoute } from "@/lib/agni/routes";
import {
  clearActiveWebCallSession,
  clearCallSessionId,
  getActiveWebCallSession,
  isCallWidgetOpen,
  setActiveWebCallSession,
  setCallSessionId,
  setCallWidgetOpen,
  useSessionId,
  type ActiveWebCallSession,
} from "@/lib/agni/session";

type Status = "idle" | "connecting" | "reconnecting" | "live" | "error";

type Line = {
  id: string;
  role: "agent" | "you";
  text: string;
  final: boolean;
};

const MAX_LINES = 40;
const RECONNECT_SETTLE_MS = 750;

/**
 * Client-side transitions keep this root-mounted component alive; a full
 * refresh rejoins LiveKit with same-tab credentials instead of creating a call.
 */
export default function AgniVoiceWidget() {
  const router = useRouter();
  const cart = useCart();
  const sessionId = useSessionId();
  const [initialActiveCall, setInitialActiveCall] = useState<
    ActiveWebCallSession | null | undefined
  >(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const roomRef = useRef<Room | null>(null);
  const cartRef = useRef(cart);
  const audioRef = useRef<HTMLDivElement>(null);
  const removeNavigationHandlersRef = useRef<(() => void) | null>(null);
  const startInFlightRef = useRef(false);
  const recoveringRef = useRef(false);
  const connectionAttemptRef = useRef(0);
  const requestAttemptRef = useRef(0);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Client Components are pre-rendered on the server, where sessionStorage is
  // unavailable. Read it after hydration so the first client render matches
  // the server and then start recovery without creating a new call.
  useEffect(() => {
    const activeCall = getActiveWebCallSession();
    setInitialActiveCall(activeCall);
    if (!activeCall) return;

    setStatus("reconnecting");
    setOpen(isCallWidgetOpen());
  }, []);

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

  const connectRoom = useCallback(async (livekitUrl: string, token: string) => {
    const attempt = ++connectionAttemptRef.current;
    const previousRoom = roomRef.current;

    // Mark the old room stale first so its disconnect event cannot overwrite
    // the replacement connection's state.
    roomRef.current = null;
    removeNavigationHandlersRef.current?.();
    removeNavigationHandlersRef.current = null;
    await previousRoom?.disconnect();

    if (connectionAttemptRef.current !== attempt) return false;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      // A refresh must look like a transient transport loss, not an explicit
      // hang-up. The next document reconnects with the persisted credentials.
      disconnectOnPageLeave: false,
    });
    roomRef.current = room;

    // Attach every handler before connect(), or the greeting can arrive before
    // the UI is listening for audio and transcripts.
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
          const message: {
            type?: string;
            url?: string;
            text?: string;
            sender?: string;
          } = JSON.parse(new TextDecoder().decode(payload));

          if (message.type === "NAVIGATE" && message.url) {
            const requested = new URL(message.url, window.location.origin);
            const route = requested.origin === window.location.origin
              ? safeInternalRoute(`${requested.pathname}${requested.search}`)
              : null;
            if (route) router.push(route);
            return;
          }

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
          /* Not a supported JSON data message. */
        }
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
        setAgentSpeaking(speakers.some((speaker) => !speaker.isLocal)),
      )
      .on(RoomEvent.AudioPlaybackStatusChanged, (playable: boolean) => {
        if (roomRef.current === room) setAudioBlocked(!playable);
      })
      .on(RoomEvent.Reconnecting, () => {
        if (roomRef.current === room) setStatus("reconnecting");
      })
      .on(RoomEvent.Reconnected, () => {
        if (roomRef.current === room) setStatus("live");
      })
      .on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        removeNavigationHandlersRef.current?.();
        removeNavigationHandlersRef.current = null;
        roomRef.current = null;
        setAgentSpeaking(false);
        setMuted(false);
        setAudioBlocked(false);

        if (recoveringRef.current) {
          setStatus("reconnecting");
          return;
        }

        clearActiveWebCallSession();
        clearCallSessionId();
        setStatus("idle");
      });

    try {
      await room.connect(livekitUrl, token);
      if (connectionAttemptRef.current !== attempt || roomRef.current !== room) {
        await room.disconnect();
        return false;
      }

      removeNavigationHandlersRef.current = setupAgentNavigation(
        room,
        router,
        () => cartRef.current,
      );

      // connect() normally resolves only after this state is reached, but an
      // unload or transport loss can race the next publish. Never ask LiveKit
      // to create the microphone track unless its engine is still connected.
      if (room.state !== ConnectionState.Connected) {
        throw new Error("The voice connection ended before the microphone was ready.");
      }
      await room.localParticipant.setMicrophoneEnabled(true);
      if (connectionAttemptRef.current !== attempt || roomRef.current !== room) {
        await room.disconnect();
        return false;
      }

      setMuted(false);
      setAudioBlocked(!room.canPlaybackAudio);
      setStatus("live");
      return true;
    } catch (cause) {
      if (roomRef.current === room) {
        roomRef.current = null;
        removeNavigationHandlersRef.current?.();
        removeNavigationHandlersRef.current = null;
        await room.disconnect();
      }
      throw cause;
    }
  }, [router, upsert]);

  const endCall = useCallback(() => {
    requestAttemptRef.current += 1;
    connectionAttemptRef.current += 1;
    removeNavigationHandlersRef.current?.();
    removeNavigationHandlersRef.current = null;
    const room = roomRef.current;
    roomRef.current = null;
    void room?.disconnect();
    setStatus("idle");
    setOpen(false);
    setAgentSpeaking(false);
    setMuted(false);
    setAudioBlocked(false);
    setCallWidgetOpen(false);
    clearActiveWebCallSession();
    clearCallSessionId();
  }, []);

  // Do not call Room.disconnect() here: refresh/unload teardown would send an
  // intentional leave to LiveKit and can make the agent end the call before
  // the next document gets a chance to rejoin. The browser closes the old
  // transport itself; only the explicit End call action sends a disconnect.
  useEffect(
    () => () => {
      requestAttemptRef.current += 1;
      connectionAttemptRef.current += 1;
      removeNavigationHandlersRef.current?.();
      removeNavigationHandlersRef.current = null;
      roomRef.current = null;
    },
    [],
  );

  const startCall = useCallback(async () => {
    if (!sessionId || startInFlightRef.current || roomRef.current) return;

    startInFlightRef.current = true;
    const requestAttempt = ++requestAttemptRef.current;
    setStatus("connecting");
    setError("");
    setLines([]);
    setOpen(true);
    setCallWidgetOpen(true);

    try {
      const response = await fetch("/api/agni/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          metadata: {
            enable_browser_navigation: true,
            current_url: window.location.href,
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
      if (requestAttemptRef.current !== requestAttempt) return;

      if (data.callSessionId) setCallSessionId(data.callSessionId);
      setActiveWebCallSession({
        livekitUrl: data.livekitUrl,
        token: data.accessToken,
        ...(data.callSessionId ? { callSessionId: data.callSessionId } : {}),
        startedAt: Date.now(),
      });
      await connectRoom(data.livekitUrl, data.accessToken);
    } catch (cause) {
      if (requestAttemptRef.current !== requestAttempt) return;
      clearActiveWebCallSession();
      clearCallSessionId();
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Could not start the call.");
    } finally {
      startInFlightRef.current = false;
    }
  }, [connectRoom, sessionId]);

  // Refresh recovery is reconnect-only. Never call the create-call endpoint
  // here: if these credentials are no longer valid, the shopper must explicitly
  // start a new call rather than silently creating another conversation.
  useEffect(() => {
    if (!sessionId || initialActiveCall === undefined) return;
    const activeCall = initialActiveCall;
    if (!activeCall) return;

    const requestAttempt = ++requestAttemptRef.current;
    recoveringRef.current = true;
    setStatus("reconnecting");
    setError("");
    setOpen(isCallWidgetOpen());

    void (async () => {
      await connectRoom(activeCall.livekitUrl, activeCall.token);
      if (requestAttemptRef.current !== requestAttempt) return;
      setStatus("reconnecting");
      await new Promise((resolve) => window.setTimeout(resolve, RECONNECT_SETTLE_MS));
      if (requestAttemptRef.current !== requestAttempt) return;
      if (!roomRef.current) throw new Error("The previous room has ended.");
      setStatus("live");
    })()
      .catch((cause) => {
        if (requestAttemptRef.current !== requestAttempt) return;
        clearActiveWebCallSession();
        clearCallSessionId();
        setStatus("error");
        setOpen(true);
        setCallWidgetOpen(true);
        setError(cause instanceof Error ? cause.message : "Could not resume the call.");
      })
      .finally(() => {
        if (requestAttemptRef.current === requestAttempt) {
          recoveringRef.current = false;
        }
      });

    return () => {
      if (requestAttemptRef.current === requestAttempt) {
        requestAttemptRef.current += 1;
        recoveringRef.current = false;
      }
    };
  }, [connectRoom, initialActiveCall, sessionId]);

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

  async function resumeAudio() {
    const room = roomRef.current;
    if (!room) return;

    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resume audio.");
    }
  }

  if (!sessionId) return null;
  const live = status === "live";
  const busy = status === "connecting" || status === "reconnecting";

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
                    : busy
                      ? "animate-pulse bg-amber-500"
                      : "bg-gray-400"
                }`}
              />
              <p className="text-sm font-semibold">
                {status === "reconnecting"
                  ? "Reconnecting…"
                  : status === "connecting"
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
            {live && audioBlocked && (
              <button
                onClick={() => void resumeAudio()}
                className="w-full rounded bg-amber-500 px-3 py-2 font-semibold text-black"
              >
                Click to resume audio
              </button>
            )}
            {!error && !lines.length && (
              <p className="text-gray-500">
                {status === "reconnecting"
                  ? "Rejoining your active call…"
                  : live
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
                onClick={() => void startCall()}
                disabled={busy}
                className="w-full rounded bg-black py-2 text-sm font-semibold text-white disabled:bg-gray-400"
              >
                {status === "reconnecting"
                  ? "Reconnecting…"
                  : status === "connecting"
                    ? "Connecting…"
                    : "Start call"}
              </button>
            )}
          </footer>
        </section>
      )}

      <button
        onClick={() => {
          if (open) closeWidget();
          else if (live || busy) showWidget();
          else void startCall();
        }}
        className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <span aria-hidden>{live ? "🔴" : busy ? "↻" : "🎙"}</span>
        {live
          ? "On call"
          : status === "reconnecting"
            ? "Reconnecting…"
            : status === "connecting"
              ? "Connecting…"
              : "Shop by voice"}
      </button>
    </div>
  );
}
