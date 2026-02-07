"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, SelectField, TextareaField } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Income, FamilyMember } from "@/lib/types/database";

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  members: FamilyMember[];
  income?: Income | null;
  defaultMemberId?: string;
}

const categoryOptions = [
  { value: "salary", label: "Salary" },
  { value: "rental", label: "Rental Income" },
  { value: "pension", label: "Pension" },
  { value: "other", label: "Other" },
];

function getMemberAge(member: FamilyMember | undefined) {
  if (!member?.date_of_birth) return null;
  const birthYear = new Date(member.date_of_birth).getFullYear();
  return { name: member.first_name, birthYear, currentAge: new Date().getFullYear() - birthYear };
}

export function IncomeForm({ open, onClose, onSaved, members, income, defaultMemberId }: IncomeFormProps) {
  const isEdit = !!income;
  const [memberId, setMemberId] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>("salary");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [taxablePct, setTaxablePct] = useState("100");
  const [startAge, setStartAge] = useState("");
  const [endAge, setEndAge] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Age info based on the SELECTED member, not the youngest
  const memberInfo = useMemo(
    () => getMemberAge(members.find((m) => m.id === memberId)),
    [members, memberId],
  );

  useEffect(() => {
    if (open) {
      const selectedId = income?.member_id || defaultMemberId || members[0]?.id || "";
      setMemberId(selectedId);
      setLabel(income?.label || "");
      setCategory(income?.category || "salary");
      setMonthlyAmount(String(income?.monthly_amount || ""));
      setTaxablePct(String(income?.taxable_pct ?? "100"));

      // Compute ages using the specific member's birth year
      const info = getMemberAge(members.find((m) => m.id === selectedId));
      if (info) {
        setStartAge(income?.start_year ? String(income.start_year - info.birthYear) : "");
        setEndAge(income?.end_year ? String(income.end_year - info.birthYear) : "");
      } else {
        setStartAge(income?.start_year ? String(income.start_year) : "");
        setEndAge(income?.end_year ? String(income.end_year) : "");
      }
      setStartNow(false);
      setNotes(income?.notes || "");
    }
  }, [open, income, defaultMemberId, members]);

  useEffect(() => {
    if (startNow && memberInfo) {
      setStartAge(String(memberInfo.currentAge));
    }
  }, [startNow, memberInfo]);

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !memberId) return;

    setSaving(true);
    const supabase = createClient();

    let startYear: number | null = null;
    let endYear: number | null = null;
    if (memberInfo) {
      startYear = startAge ? memberInfo.birthYear + parseInt(startAge) : null;
      endYear = endAge ? memberInfo.birthYear + parseInt(endAge) : null;
    } else {
      startYear = startAge ? parseInt(startAge) : null;
      endYear = endAge ? parseInt(endAge) : null;
    }

    const payload = {
      member_id: memberId,
      label: label.trim(),
      category,
      monthly_amount: parseFloat(monthlyAmount) || 0,
      taxable_pct: parseFloat(taxablePct) ?? 100,
      start_year: startYear,
      end_year: endYear,
      notes: notes.trim() || null,
    };

    if (isEdit && income) {
      await supabase.from("income").update(payload).eq("id", income.id);
    } else {
      await supabase.from("income").insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Income" : "Add Income"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {members.length > 1 && (
          <SelectField
            label="Family Member"
            id="income-member"
            options={memberOptions}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
        )}
        <InputField
          label="Label"
          id="income-label"
          placeholder="e.g. Salary - Employer"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <SelectField
            label="Category"
            id="income-category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <InputField
            label="Taxable (%)"
            id="income-taxable"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={taxablePct}
            onChange={(e) => setTaxablePct(e.target.value)}
          />
        </div>
        <CurrencyInput
          label="Monthly Amount (R)"
          id="income-amount"
          value={monthlyAmount}
          onChange={setMonthlyAmount}
          required
        />

        {memberInfo && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", margin: 0 }}>
            {memberInfo.name} is currently {memberInfo.currentAge} years old
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <div>
            <InputField
              label={memberInfo ? `Start Age (${memberInfo.name})` : "Start Year"}
              id="income-start"
              type="number"
              min={memberInfo ? "0" : "2000"}
              max={memberInfo ? "120" : "2100"}
              placeholder={memberInfo ? `e.g. ${memberInfo.currentAge}` : "Optional"}
              value={startAge}
              onChange={(e) => { setStartAge(e.target.value); setStartNow(false); }}
              disabled={startNow}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--gray-500)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={startNow}
                onChange={(e) => setStartNow(e.target.checked)}
              />
              Start now
            </label>
          </div>
          <InputField
            label={memberInfo ? `End Age (${memberInfo.name})` : "End Year"}
            id="income-end"
            type="number"
            min={memberInfo ? "0" : "2000"}
            max={memberInfo ? "120" : "2100"}
            placeholder="Optional"
            value={endAge}
            onChange={(e) => setEndAge(e.target.value)}
          />
        </div>
        <TextareaField
          label="Notes"
          id="income-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Income"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
