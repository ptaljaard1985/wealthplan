"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, TextareaField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { FamilyMember } from "@/lib/types/database";

interface MemberFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  familyId: string;
  member?: FamilyMember | null;
}

export function MemberForm({ open, onClose, onSaved, familyId, member }: MemberFormProps) {
  const isEdit = !!member;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [retirementAge, setRetirementAge] = useState("65");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(member?.first_name || "");
      setLastName(member?.last_name || "");
      setEmail(member?.email || "");
      setPhone(member?.phone || "");
      setDob(member?.date_of_birth || "");
      setRetirementAge(String(member?.retirement_age || 65));
      setNotes(member?.notes || "");
    }
  }, [open, member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const payload = {
      family_id: familyId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dob || null,
      retirement_age: parseInt(retirementAge) || 65,
      notes: notes.trim() || null,
    };

    if (isEdit && member) {
      await supabase.from("family_members").update(payload).eq("id", member.id);
    } else {
      await supabase.from("family_members").insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Member" : "Add Member"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <InputField
            label="First Name"
            id="member-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <InputField
            label="Last Name"
            id="member-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <InputField
            label="Email"
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            label="Phone"
            id="member-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <InputField
            label="Date of Birth"
            id="member-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          <InputField
            label="Retirement Age"
            id="member-retirement"
            type="number"
            min="30"
            max="100"
            value={retirementAge}
            onChange={(e) => setRetirementAge(e.target.value)}
          />
        </div>
        <TextareaField
          label="Notes"
          id="member-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
