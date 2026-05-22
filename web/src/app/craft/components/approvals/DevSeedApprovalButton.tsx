"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";

import { Button } from "@opal/components";
import { useBuildSessionStore } from "@/app/craft/hooks/useBuildSessionStore";
import { StreamItem } from "@/app/craft/types/displayTypes";
import { BUILD_API_BASE } from "@/app/craft/v1/constants";
import { SWR_KEYS } from "@/lib/swr-keys";

interface DevSeedApprovalButtonProps {
  sessionId: string | null;
}

// Static "mock stream" lead-in. The agent has no prior knowledge that
// the proxy will gate this — the last visible packet is just the
// tool invocation. The approval card surfaces *because of* that
// invocation, not because the agent announced it.
function fakeAgentLeadIn(): StreamItem[] {
  const baseId = `dev-seed-${Date.now()}`;
  return [
    {
      type: "text",
      id: `${baseId}-text`,
      content: "I'll post that to Slack now.",
      isStreaming: false,
    },
    {
      type: "tool_call",
      id: `${baseId}-tool`,
      toolCall: {
        id: `${baseId}-tool`,
        kind: "other",
        title: "slack.send_message",
        description: "Calling slack.send_message",
        command: "slack.send_message",
        status: "in_progress",
        rawOutput: "",
      },
    },
  ];
}

export default function DevSeedApprovalButton({
  sessionId,
}: DevSeedApprovalButtonProps) {
  const { mutate } = useSWRConfig();
  const appendStreamItem = useBuildSessionStore(
    (state) => state.appendStreamItem
  );
  const [busy, setBusy] = useState(false);

  if (!sessionId) {
    return null;
  }

  async function seed() {
    if (!sessionId) return;
    setBusy(true);
    try {
      for (const item of fakeAgentLeadIn()) {
        appendStreamItem(sessionId, item);
      }
      const res = await fetch(`${BUILD_API_BASE}/approvals/dev/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) {
        throw new Error(`seed failed: ${res.status}`);
      }
      // Belt and suspenders. Backend already RPUSHes announce; if no chat
      // stream is open the announce just sits there, so kick a refetch.
      void mutate(SWR_KEYS.buildSessionLiveApprovals(sessionId));
    } catch (e) {
      console.error("[dev seed approval]", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button prominence="tertiary" size="sm" disabled={busy} onClick={seed}>
      {busy ? "Seeding…" : "Seed approval (dev)"}
    </Button>
  );
}
