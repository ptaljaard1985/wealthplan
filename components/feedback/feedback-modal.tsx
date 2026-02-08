"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextareaField, InputField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  screenPath: string;
}

const typeOptions = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "question", label: "Question" },
];

export function FeedbackModal({ open, onClose, screenPath }: FeedbackModalProps) {
  const [requestType, setRequestType] = useState("bug");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
      screen_path: screenPath,
    });

    setSaving(false);

    if (!error) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setRequestType("bug");
        setDetails("");
        onClose();
      }, 1500);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send Feedback">
      {success ? (
        <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--success-700)" }}>
            Thank you for your feedback!
          </p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginTop: "var(--space-2)" }}>
            We&apos;ll review it shortly.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          <SelectField
            label="Type"
            id="feedback-type"
            options={typeOptions}
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
          />
          <TextareaField
            label="Details"
            id="feedback-details"
            placeholder="Describe the bug, feature, or question..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
          />
          <InputField
            label="Screen"
            id="feedback-screen"
            value={screenPath}
            readOnly
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
              Submit
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
