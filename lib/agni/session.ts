"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "snowie_session_id";
const CALL_SESSION_STORAGE_KEY = "agni_call_session_id";
const WIDGET_OPEN_STORAGE_KEY = "agni_widget_open";
const ACTIVE_WEB_CALL_STORAGE_KEY = "agni_active_webcall_session";
const ACTIVE_WEB_CALL_MAX_AGE_MS = 60 * 60 * 1000;

export type ActiveWebCallSession = {
  livekitUrl: string;
  token: string;
  callSessionId?: string;
  startedAt: number;
};

let cached = "";

/**
 * Same key/format the Agni widget and tracker use, so the id the widget sends
 * to the voice backend is the id our context and action queues are keyed by.
 */
export function getSessionId() {
  if (typeof window === "undefined") return "";
  if (cached) return cached;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    if (existing) {
      cached = existing;
      return cached;
    }

    cached = `sn_${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, cached);

    return cached;
  } catch {
    return "";
  }
}

const subscribe = () => () => {};

/**
 * The id is unavailable while rendering on the server, so it arrives after
 * hydration rather than through a state-setting effect.
 */
export function useSessionId() {
  return useSyncExternalStore(
    subscribe,
    () => getSessionId(),
    () => "",
  );
}

/** Agni's call id is separate from the shopper id used by browser actions. */
export function getCallSessionId() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(CALL_SESSION_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setCallSessionId(callSessionId: string) {
  if (typeof window === "undefined" || !callSessionId.trim()) return;

  try {
    window.localStorage.setItem(CALL_SESSION_STORAGE_KEY, callSessionId.trim());
  } catch {
    /* Storage can be unavailable in private or restricted browser contexts. */
  }
}

export function clearCallSessionId() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CALL_SESSION_STORAGE_KEY);
  } catch {
    /* Storage can be unavailable in private or restricted browser contexts. */
  }
}

export function isCallWidgetOpen() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(WIDGET_OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCallWidgetOpen(open: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(WIDGET_OPEN_STORAGE_KEY, String(open));
  } catch {
    /* Storage can be unavailable in private or restricted browser contexts. */
  }
}

/**
 * LiveKit credentials for an active call, scoped to this browser tab. This is
 * intentionally sessionStorage: a refresh can rejoin the room, but a second
 * tab must not silently join the shopper's microphone session.
 */
export function getActiveWebCallSession(): ActiveWebCallSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ACTIVE_WEB_CALL_STORAGE_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error("Invalid call session");

    const session = value as Record<string, unknown>;
    const livekitUrl = session.livekitUrl;
    const token = session.token;
    const callSessionId = session.callSessionId;
    const startedAt = session.startedAt;

    if (
      typeof livekitUrl !== "string" ||
      !livekitUrl ||
      typeof token !== "string" ||
      !token ||
      (callSessionId !== undefined && typeof callSessionId !== "string") ||
      typeof startedAt !== "number"
    ) {
      throw new Error("Invalid call session");
    }

    const age = Date.now() - startedAt;
    if (!Number.isFinite(age) || age < 0 || age >= ACTIVE_WEB_CALL_MAX_AGE_MS) {
      throw new Error("Expired call session");
    }

    return {
      livekitUrl,
      token,
      ...(callSessionId ? { callSessionId } : {}),
      startedAt,
    };
  } catch {
    clearActiveWebCallSession();
    return null;
  }
}

export function setActiveWebCallSession(session: ActiveWebCallSession) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ACTIVE_WEB_CALL_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* The call still works when storage is unavailable; refresh recovery does not. */
  }
}

export function clearActiveWebCallSession() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ACTIVE_WEB_CALL_STORAGE_KEY);
  } catch {
    /* Storage can be unavailable in private or restricted browser contexts. */
  }
}
