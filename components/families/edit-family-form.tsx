"use client";

import { useState } from "react";
import { InputField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ClientFamily } from "@/lib/types/database";

interface EditFamilyFormProps {
  family: ClientFamily;
  onSaved: () => void;
  onCancel: () => void;
}

export function EditFamilyForm({ family, onSaved, onCancel }: EditFamilyFormProps) {
  const [familyName, setFamilyName] = useState(family.family_name);
  const [inflationRate, setInflationRate] = useState(String(family.inflation_rate_pct));
  const [notes, setNotes] = useState(family.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("client_families")
      .update({
        family_name: familyName.trim(),
        inflation_rate_pct: parseFloat(inflationRate) || 6.0,
        notes: notes.trim() || null,
      })
      .eq("id", family.id);

    setSaving(false);
    if (!error) onSaved();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <InputField
        label="Family Name"
        id="edit-family-name"
        value={familyName}
        onChange={(e) => setFamilyName(e.target.value)}
        required
      />
      <InputField
        label="Inflation Rate (%)"
        id="edit-inflation-rate"
        type="number"
        step="0.01"
        min="0"
        max="30"
        value={inflationRate}
        onChange={(e) => setInflationRate(e.target.value)}
      />
      <TextareaField
        label="Notes"
        id="edit-family-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
