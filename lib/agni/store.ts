import type { ActionResult, AgniAction, PageReport, QueuedAction } from "@/lib/agni/types";

type Session = {
  context: string;
  contextAt: number;
  page?: PageReport;
  queue: QueuedAction[];
  results: ActionResult[];
  lastActionId?: string;
  lastActionQueuedAt?: number;
  updatedAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;
const MAX_QUEUE = 20;
const MAX_RESULTS = 8;

/**
 * Process-local store. Fine for a single-instance POC; swap the four exported
 * functions for Redis in a multi-instance deploy — the contract is stable.
 * Kept on `globalThis` so dev-mode hot reloads don't drop live sessions.
 */
const store: Map<string, Session> = ((
  globalThis as typeof globalThis & { __agniStore?: Map<string, Session> }
).__agniStore ??= new Map());

function sweep(now: number) {
  for (const [id, session] of store) {
    if (now - session.updatedAt > SESSION_TTL_MS) store.delete(id);
  }

  while (store.size > MAX_SESSIONS) {
    const oldest = [...store.entries()].reduce((a, b) =>
      a[1].updatedAt <= b[1].updatedAt ? a : b,
    );
    store.delete(oldest[0]);
  }
}

function session(sessionId: string) {
  const now = Date.now();
  sweep(now);

  const existing = store.get(sessionId);

  if (existing) {
    existing.updatedAt = now;
    return existing;
  }

  const created: Session = {
    context: "",
    contextAt: 0,
    queue: [],
    results: [],
    updatedAt: now,
  };
  store.set(sessionId, created);

  return created;
}

export function setContext(sessionId: string, context: string) {
  const current = session(sessionId);
  current.context = context;
  current.contextAt = Date.now();
}

/**
 * The structured version of the same report. The custom functions read this to
 * validate a request before queuing an action the page would only reject.
 */
export function setPage(sessionId: string, page: PageReport) {
  session(sessionId).page = page;
}

export function getPage(sessionId: string) {
  return store.get(sessionId)?.page;
}

export function getContext(sessionId: string) {
  const current = store.get(sessionId);

  if (!current?.context) return null;

  return { context: current.context, contextAt: current.contextAt };
}

export function enqueueAction(sessionId: string, action: AgniAction) {
  const current = session(sessionId);
  const queued: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
  };

  current.queue.push(queued);
  current.lastActionId = queued.id;
  current.lastActionQueuedAt = queued.queuedAt;

  if (current.queue.length > MAX_QUEUE) {
    current.queue.splice(0, current.queue.length - MAX_QUEUE);
  }

  return queued;
}

/** Drains the queue — the bridge is the only reader, and it retries itself. */
export function drainActions(sessionId: string) {
  const current = session(sessionId);
  const actions = current.queue;
  current.queue = [];

  return actions;
}

export function recordResults(sessionId: string, results: ActionResult[]) {
  const current = session(sessionId);
  current.results = [...current.results, ...results].slice(-MAX_RESULTS);
}

export function getResults(sessionId: string) {
  return store.get(sessionId)?.results ?? [];
}

export function getActionState(sessionId: string) {
  const current = store.get(sessionId);

  if (!current?.lastActionId) return { pending: false, resultAt: undefined };

  const result = current.results.find(({ id }) => id === current.lastActionId);

  return {
    pending: !result,
    resultAt: result?.at,
    queuedAt: current.lastActionQueuedAt,
  };
}
