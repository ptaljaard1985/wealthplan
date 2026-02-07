"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AddFamilyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddFamilyModal({ open, onClose, onCreated }: AddFamilyModalProps) {
  const [familyName, setFamilyName] = useState("");
  const [inflationRate, setInflationRate] = useState("6.00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_families").insert({
      family_name: familyName.trim(),
      inflation_rate_pct: parseFloat(inflationRate) || 6.0,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (!error) {
      setFamilyName("");
      setInflationRate("6.00");
      setNotes("");
      onCreated();
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Client Family">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <InputField
          label="Family Name"
          id="family-name"
          placeholder="e.g. Taljaard Family"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          required
        />
        <InputField
          label="Inflation Rate (%)"
          id="inflation-rate"
          type="number"
          step="0.01"
          min="0"
          max="30"
          value={inflationRate}
          onChange={(e) => setInflationRate(e.target.value)}
        />
        <TextareaField
          label="Notes"
          id="family-notes"
          placeholder="Optional notes about this family..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            Create Family
          </Button>
        </div>
      </form>
    </Modal>
  );
}
