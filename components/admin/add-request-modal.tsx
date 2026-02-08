"use client";

import { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { triggerAnalysis } from "@/lib/ai/trigger-analysis";

interface AddRequestModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const typeOptions = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "question", label: "Question" },
];

export function AddRequestModal({ open, onClose, onCreated }: AddRequestModalProps) {
  const [requestType, setRequestType] = useState("feature");
  const [details, setDetails] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("support_requests")
      .insert({
        user_id: user.id,
        user_email: user.email!,
        request_type: requestType,
        details: details.trim(),
        screen_path: "/admin",
      })
      .select("id")
      .single();

    setSaving(false);
    if (!error && inserted) {
      // Upload pending files
      for (const file of pendingFiles) {
        const storagePath = `${inserted.id}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("ticket-attachments")
          .upload(storagePath, file);
        if (!uploadErr) {
          await supabase.from("ticket_attachments").insert({
            ticket_id: inserted.id,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            storage_path: storagePath,
            uploaded_by: user.id,
          });
        }
      }

      triggerAnalysis(inserted.id);
      setRequestType("feature");
      setDetails("");
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onCreated();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Request">
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      >
        <SelectField
          label="Type"
          id="add-request-type"
          options={typeOptions}
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
        />
        <TextareaField
          label="Details"
          id="add-request-details"
          placeholder="Describe the bug, feature, or question..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
        />
        <div>
          <label
            className="label"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}
          >
            <Paperclip size={14} />
            Attachments
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
            style={{ fontSize: "var(--text-sm)" }}
          />
          {pendingFiles.length > 0 && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", marginTop: "var(--space-1)" }}>
              {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
            marginTop: "var(--space-2)",
          }}
        >
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
