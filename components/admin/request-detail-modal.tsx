"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <span className={`badge ${statusBadgeClass[request.status]}`}>
            {statusLabels[request.status]}
          </span>
          <span className="badge">{request.request_type}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>
            {formatRelativeTime(request.created_at)}
          </span>
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
