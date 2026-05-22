"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  ApprovalSubmitDecision,
  ApprovalView,
} from "@/app/craft/types/approvals";
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

  // Guards setState after the post-decision SWR revalidation drops
  // this row from /live and the card unmounts mid-await.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const label = resolveActionLabel(approval.action_type);
  const swrKey = SWR_KEYS.buildSessionLiveApprovals(approval.session_id);

  async function decide(decision: ApprovalSubmitDecision) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await postApprovalDecision(approval.approval_id, decision);
      void mutate(swrKey);
    } catch (e) {
      // 409 = already resolved (by someone else, or expired by the
      // proxy). Same UX as a successful submit: refetch and unmount.
      if (e instanceof ApprovalConflictError) {
        void mutate(swrKey);
        return;
      }
      if (mountedRef.current) {
        setErrorMessage(
          e instanceof Error ? e.message : "Failed to submit decision"
        );
      }
    } finally {
      // Card usually unmounts on the next render once /live drops the
      // row, but if revalidation lags or the row stays visible we
      // still need to unstick the buttons.
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }

  return (
    <Card variant="secondary">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
          {expanded ? (
            <SvgChevronDown className="w-4 h-4 text-text-04 shrink-0" />
          ) : (
            <SvgChevronRight className="w-4 h-4 text-text-04 shrink-0" />
          )}
          <Text font="main-ui-action" color="text-05">
            {label}
          </Text>
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
