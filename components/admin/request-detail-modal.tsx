"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TicketAttachments } from "@/components/shared/ticket-attachments";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/formatters";
import type { SupportRequest } from "@/lib/types/database";

interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  request: SupportRequest;
  onRefresh: () => void;
}

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  done: "Done",
};

const statusBadgeClass: Record<string, string> = {
  new: "badge-warning",
  in_progress: "badge-info",
  done: "badge-success",
};

export function RequestDetailModal({ open, onClose, request, onRefresh }: RequestDetailModalProps) {
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [aiStatus, setAiStatus] = useState(request.ai_analysis_status);
  const [aiSummary, setAiSummary] = useState(request.ai_summary);
  const [aiAreas, setAiAreas] = useState(request.ai_affected_areas);
  const [aiSteps, setAiSteps] = useState(request.ai_implementation);
  const [aiPrompt, setAiPrompt] = useState(request.ai_prompt);
  const [copied, setCopied] = useState(false);
  const [priority, setPriority] = useState<SupportRequest["priority"]>(request.priority);

  async function handlePriorityChange(p: SupportRequest["priority"]) {
    const next = p === priority ? null : p;
    setPriority(next);
    const supabase = createClient();
    await supabase
      .from("support_requests")
      .update({ priority: next, updated_at: new Date().toISOString() })
      .eq("id", request.id);
    onRefresh();
  }

  async function handleSaveNotes() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("support_requests")
      .update({ admin_notes: adminNotes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", request.id);
    setSaving(false);
    onRefresh();
  }

  async function handleAnalyse() {
    setAnalysing(true);
    setAiStatus("analyzing");
    try {
      const res = await fetch("/api/analyse-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      });
      if (res.ok) {
        const { analysis } = await res.json();
        setAiSummary(analysis.summary);
        setAiAreas(analysis.affectedAreas);
        setAiSteps(analysis.implementation);
        setAiPrompt(analysis.prompt);
        setAiStatus("done");
      } else {
        setAiStatus("error");
      }
    } catch {
      setAiStatus("error");
    }
    setAnalysing(false);
    onRefresh();
  }

  async function handleStatusChange(newStatus: SupportRequest["status"]) {
    const supabase = createClient();
    await supabase
      .from("support_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", request.id);
    onRefresh();
    onClose();
  }

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("support_requests").delete().eq("id", request.id);
    onRefresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Details">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Meta */}
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <span className={`badge ${statusBadgeClass[request.status]}`}>
            {statusLabels[request.status]}
          </span>
          <span className="badge">{request.request_type}</span>
          {priority && (
            <span className={`badge ${priority === "p1" ? "badge-error" : priority === "p2" ? "badge-warning" : "badge-info"}`}
              style={{ fontWeight: 700 }}>
              {priority.toUpperCase()}
            </span>
          )}
          <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>
            {formatRelativeTime(request.created_at)}
          </span>
        </div>

        {/* Priority */}
        <div>
          <p className="label" style={{ marginBottom: "var(--space-2)" }}>Priority</p>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {(["p1", "p2", "p3"] as const).map((p) => (
              <button
                key={p}
                className={priority === p ? "btn-primary" : "btn-secondary"}
                style={{
                  padding: "4px 12px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  ...(priority === p && p === "p1" ? { background: "var(--error-500)" } : {}),
                  ...(priority === p && p === "p2" ? { background: "var(--warning-500)" } : {}),
                  ...(priority === p && p === "p3" ? { background: "var(--info-500)" } : {}),
                }}
                onClick={() => handlePriorityChange(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Submitter */}
        <div>
          <p className="label">Submitted by</p>
          <p style={{ fontSize: "var(--text-sm)" }}>{request.user_email}</p>
        </div>

        {/* Screen */}
        {request.screen_path && (
          <div>
            <p className="label">Screen</p>
            <p style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
              {request.screen_path}
            </p>
          </div>
        )}

        {/* Details */}
        <div>
          <p className="label">Details</p>
          <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{request.details}</p>
        </div>

        {/* Attachments */}
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
          <TicketAttachments ticketId={request.id} canUpload={true} canDelete={true} />
        </div>

        {/* AI Analysis */}
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <p className="label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", margin: 0 }}>
              <Sparkles size={14} />
              AI Analysis
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={analysing}
              onClick={handleAnalyse}
            >
              {aiStatus === "done" ? "Re-analyse" : "Analyse"}
            </Button>
          </div>

          {aiStatus === "pending" && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-400)", fontStyle: "italic" }}>
              Analysis not yet run.
            </p>
          )}

          {aiStatus === "analyzing" && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>
              <Loader2 size={14} className="spin" />
              Analysing ticket...
            </div>
          )}

          {aiStatus === "error" && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--error-500)" }}>
              Analysis failed. Click &quot;Analyse&quot; to retry.
            </p>
          )}

          {aiStatus === "done" && aiSummary && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--gray-500)", marginBottom: "var(--space-1)" }}>Summary</p>
                <p style={{ fontSize: "var(--text-sm)" }}>{aiSummary}</p>
              </div>

              {aiAreas && aiAreas.length > 0 && (
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--gray-500)", marginBottom: "var(--space-1)" }}>Affected Areas</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                    {aiAreas.map((area, i) => (
                      <span key={i} className="badge" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiSteps && aiSteps.length > 0 && (
                <div>
                  <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--gray-500)", marginBottom: "var(--space-1)" }}>Implementation Steps</p>
                  <ol style={{ margin: 0, paddingLeft: "var(--space-5)", fontSize: "var(--text-sm)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {aiSteps.map((s) => (
                      <li key={s.step}>
                        {s.description}
                        {s.file && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--gray-500)", marginLeft: "var(--space-1)" }}>
                            ({s.file})
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {aiPrompt && (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(aiPrompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy prompt for Claude Code"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Notes */}
        <TextareaField
          label="Admin Notes"
          id="admin-notes"
          placeholder="Internal notes..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" loading={saving} onClick={handleSaveNotes}>
            Save Notes
          </Button>
        </div>

        {/* Status Actions */}
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
          <p className="label" style={{ marginBottom: "var(--space-3)" }}>Move to</p>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {(["new", "in_progress", "done"] as const).map((s) =>
              s !== request.status ? (
                <Button key={s} variant="secondary" size="sm" onClick={() => handleStatusChange(s)}>
                  {statusLabels[s]}
                </Button>
              ) : null
            )}
          </div>
        </div>

        {/* Delete */}
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--error-500)" }}>
                Are you sure?
              </span>
              <Button variant="primary" size="sm" onClick={handleDelete} style={{ background: "var(--error-500)" }}>
                Yes, delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} style={{ color: "var(--error-500)" }}>
              Delete request
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
