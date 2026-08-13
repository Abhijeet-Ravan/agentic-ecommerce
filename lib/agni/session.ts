"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "snowie_session_id";

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
