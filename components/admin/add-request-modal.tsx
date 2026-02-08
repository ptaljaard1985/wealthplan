"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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
  const [saving, setSaving] = useState(false);

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

    const { error } = await supabase.from("support_requests").insert({
      user_id: user.id,
      user_email: user.email!,
      request_type: requestType,
      details: details.trim(),
      screen_path: "/admin",
    });

    setSaving(false);
    if (!error) {
      setRequestType("feature");
      setDetails("");
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
