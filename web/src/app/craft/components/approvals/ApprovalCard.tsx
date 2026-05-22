"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";

import { Button, Text } from "@opal/components";
import Card from "@/refresh-components/cards/Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/refresh-components/Collapsible";
import {
  ApprovalConflictError,
  postApprovalDecision,
} from "@/app/craft/services/apiServices";
import { ApprovalView } from "@/app/craft/types/approvals";
import { resolveActionLabel } from "@/app/craft/components/approvals/actionLabels";
import PayloadView from "@/app/craft/components/approvals/PayloadView";
import { SWR_KEYS } from "@/lib/swr-keys";
import { SvgChevronDown, SvgChevronRight } from "@opal/icons";

interface ApprovalCardProps {
  approval: ApprovalView;
}

export default function ApprovalCard({ approval }: ApprovalCardProps) {
  const { mutate } = useSWRConfig();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const label = resolveActionLabel(approval.action_type);
  const swrKey = SWR_KEYS.buildSessionLiveApprovals(approval.session_id);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await postApprovalDecision(approval.approval_id, decision);
      void mutate(swrKey);
    } catch (e) {
      // 409 means someone else (or the proxy timeout) already resolved
      // it — same UX as a successful submit.
      if (e instanceof ApprovalConflictError) {
        void mutate(swrKey);
        return;
      }
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to submit decision"
      );
      setSubmitting(false);
    }
  }

  return (
    <Card variant="secondary">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left"
            aria-expanded={expanded}
          >
            {expanded ? (
              <SvgChevronDown className="w-4 h-4 text-text-04 shrink-0" />
            ) : (
              <SvgChevronRight className="w-4 h-4 text-text-04 shrink-0" />
            )}
            <Text font="main-ui-action" color="text-05">
              {label}
            </Text>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3">
            <PayloadView
              actionType={approval.action_type}
              payload={approval.payload}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex items-center gap-2">
        <Button
          prominence="primary"
          disabled={submitting}
          onClick={() => decide("APPROVED")}
        >
          Approve
        </Button>
        <Button
          prominence="secondary"
          disabled={submitting}
          onClick={() => decide("REJECTED")}
        >
          Reject
        </Button>
      </div>
      {errorMessage && (
        <div className="text-status-error-05">
          <Text font="secondary-body" color="inherit">
            {errorMessage}
          </Text>
        </div>
      )}
    </Card>
  );
}
