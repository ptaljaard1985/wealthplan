"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { LifeEvent } from "@/lib/types/database";

const ICON_OPTIONS = [
  { value: "milestone", label: "Milestone" },
  { value: "retire", label: "Retirement" },
  { value: "home", label: "Property" },
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical" },
  { value: "travel", label: "Travel" },
  { value: "gift", label: "Gift / Legacy" },
] as const;

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  familyId: string;
  event?: LifeEvent | null;
  youngestMember?: { name: string; birthYear: number; currentAge: number } | null;
}

export function EventForm({ open, onClose, onSaved, familyId, event, youngestMember }: EventFormProps) {
  const isEdit = !!event;
  const [label, setLabel] = useState("");
  const [age, setAge] = useState("");
  const [icon, setIcon] = useState("milestone");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const ym = youngestMember ?? null;

  useEffect(() => {
    if (open) {
      setLabel(event?.label || "");
      setIcon(event?.icon || "milestone");
      setNotes(event?.notes || "");

      if (ym) {
        const a = event?.event_year
          ? String(event.event_year - ym.birthYear)
          : String(ym.currentAge);
        setAge(a);
      } else {
        setAge(String(event?.event_year || new Date().getFullYear()));
      }
    }
  }, [open, event, ym]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !age) return;

    setSaving(true);
    const supabase = createClient();

    let eventYear: number;
    if (ym) {
      eventYear = age ? ym.birthYear + parseInt(age) : new Date().getFullYear();
    } else {
      eventYear = parseInt(age) || new Date().getFullYear();
    }

    const iconOption = ICON_OPTIONS.find((o) => o.value === icon);
    const payload = {
      family_id: familyId,
      label: label.trim(),
      event_year: eventYear,
      icon,
      color: iconOption ? getIconColor(icon) : null,
      notes: notes.trim() || null,
    };

    if (isEdit && event) {
      const { error } = await supabase.from("events").update(payload).eq("id", event.id);
      if (error) { console.error("Event update failed:", error); alert(`Save failed: ${error.message}`); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) { console.error("Event insert failed:", error); alert(`Save failed: ${error.message}`); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Event" : "Add Event"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <InputField
          label="Label"
          id="event-label"
          placeholder="e.g. Retire, Sell house"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />

        {ym && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", margin: 0 }}>
            {ym.name} is currently {ym.currentAge} years old
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <InputField
            label={ym ? "Age" : "Year"}
            id="event-age"
            type="number"
            min={ym ? "0" : "2000"}
            max={ym ? "120" : "2100"}
            placeholder={ym ? `e.g. ${ym.currentAge + 10}` : String(new Date().getFullYear())}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
          <div>
            <label htmlFor="event-icon" className="label">Category</label>
            <select
              id="event-icon"
              className="input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <TextareaField
          label="Notes"
          id="event-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function getIconColor(icon: string): string {
  const map: Record<string, string> = {
    milestone: "#ac9121",
    retire: "#d94f4f",
    home: "#c9822b",
    education: "#2f6fbd",
    medical: "#e74c3c",
    travel: "#2f9464",
    gift: "#6b5fa0",
  };
  return map[icon] || "#ac9121";
}
