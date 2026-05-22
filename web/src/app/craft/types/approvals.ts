export type ApprovalDecision = "APPROVED" | "REJECTED" | "EXPIRED";

export interface ApprovalView {
  approval_id: string;
  session_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  decision: ApprovalDecision | null;
  decided_at: string | null;
  is_live: boolean;
}

export interface ApprovalListResponse {
  items: ApprovalView[];
}
