"use client";

import { useState } from "react";
import { Bug, Lightbulb, HelpCircle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/formatters";
import { RequestDetailModal } from "./request-detail-modal";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type { SupportRequest } from "@/lib/types/database";

interface KanbanBoardProps {
  requests: SupportRequest[];
  onRefresh: () => void;
}

const columns: { key: SupportRequest["status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const typeIcons: Record<string, React.ReactNode> = {
  bug: <Bug size={14} />,
  feature: <Lightbulb size={14} />,
  question: <HelpCircle size={14} />,
};

const typeBadgeClass: Record<string, string> = {
  bug: "badge-error",
  feature: "badge-brand",
  question: "badge-info",
};

const nextStatus: Record<string, SupportRequest["status"] | null> = {
  new: "in_progress",
  in_progress: "done",
  done: null,
};

const prevStatus: Record<string, SupportRequest["status"] | null> = {
  new: null,
  in_progress: "new",
  done: "in_progress",
};

export function KanbanBoard({ requests, onRefresh }: KanbanBoardProps) {
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  async function moveRequest(id: string, newStatus: SupportRequest["status"]) {
    const supabase = createClient();
    await supabase
      .from("support_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
    onRefresh();
  }

  return (
    <>
      <div className="kanban-board">
        {columns.map((col) => {
          const items = requests.filter((r) => r.status === col.key);
          return (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <span>{col.label}</span>
                <span className="badge" style={{ marginLeft: "var(--space-2)" }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {items.length === 0 && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", textAlign: "center", padding: "var(--space-4) 0" }}>
                    No requests
                  </p>
                )}
                {items.map((req) => (
                  <div
                    key={req.id}
                    className="kanban-card"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <span className={`badge ${typeBadgeClass[req.request_type]}`}>
                          {typeIcons[req.request_type]}
                          <span style={{ marginLeft: "4px" }}>{req.request_type}</span>
                        </span>
                        {req.priority && (
                          <span className={`badge ${req.priority === "p1" ? "badge-error" : req.priority === "p2" ? "badge-warning" : "badge-info"}`}
                            style={{ fontWeight: 700, fontSize: "var(--text-xs)" }}>
                            {req.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--gray-400)" }}>
                        {req.ai_analysis_status === "done" && (
                          <Sparkles size={12} style={{ color: "var(--brand-500)" }} />
                        )}
                        {formatRelativeTime(req.created_at)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--gray-800)",
                      marginTop: "var(--space-2)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {req.details}
                    </p>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "var(--space-3)",
                    }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>
                        {req.user_email}
                      </span>
                      <div style={{ display: "flex", gap: "var(--space-1)" }} onClick={(e) => e.stopPropagation()}>
                        {prevStatus[req.status] && (
                          <button
                            className="btn-ghost"
                            style={{ padding: "2px 6px" }}
                            title={`Move to ${prevStatus[req.status]}`}
                            onClick={() => moveRequest(req.id, prevStatus[req.status]!)}
                          >
                            <ArrowLeft size={14} />
                          </button>
                        )}
                        {nextStatus[req.status] && (
                          <button
                            className="btn-ghost"
                            style={{ padding: "2px 6px" }}
                            title={`Move to ${nextStatus[req.status]}`}
                            onClick={() => moveRequest(req.id, nextStatus[req.status]!)}
                          >
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {selectedRequest && (
        <ErrorBoundary>
          <RequestDetailModal
            key={selectedRequest.id}
            open={!!selectedRequest}
            onClose={() => setSelectedRequest(null)}
            request={selectedRequest}
            onRefresh={onRefresh}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
