"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "snowie_session_id";
const CALL_SESSION_STORAGE_KEY = "agni_call_session_id";
const WIDGET_OPEN_STORAGE_KEY = "agni_widget_open";

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
