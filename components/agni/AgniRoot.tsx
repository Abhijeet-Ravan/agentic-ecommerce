"use client";

import { Suspense } from "react";
import AgniBridge from "@/components/agni/AgniBridge";
import AgniContextReporter from "@/components/agni/AgniContextReporter";
import AgniDebugPanel from "@/components/agni/AgniDebugPanel";
import AgniVoiceWidget from "@/components/agni/AgniVoiceWidget";
import { agniConfig, useAgniEnabled } from "@/components/agni/config";

/**
 * Single mount point for the shopping agent — never per page, never re-keyed,
 * so a voice call survives client-side navigation.
 */
export default function AgniRoot() {
  const voiceEnabled = useAgniEnabled();

  if (!voiceEnabled && !agniConfig.debug) return null;

  return (
    <>
      {/* useSearchParams suspends during prerender; keep it out of the page shell. */}
      <Suspense fallback={null}>
        <AgniContextReporter />
      </Suspense>
      <AgniBridge />
      {voiceEnabled && <AgniVoiceWidget />}
      {agniConfig.debug && <AgniDebugPanel />}
    </>
  );
}
