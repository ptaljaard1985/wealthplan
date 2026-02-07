"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, SelectField, TextareaField } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Expense } from "@/lib/types/database";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  familyId: string;
  expense?: Expense | null;
  youngestMember?: { name: string; birthYear: number; currentAge: number } | null;
}

const categoryOptions = [
  { value: "living_expenses", label: "Living Expenses" },
  { value: "insurance", label: "Insurance" },
  { value: "medical", label: "Medical" },
  { value: "education", label: "Education" },
  { value: "transport", label: "Transport" },
  { value: "housing", label: "Housing" },
  { value: "tax", label: "Tax" },
  { value: "other", label: "Other" },
];

export function ExpenseForm({ open, onClose, onSaved, familyId, expense, youngestMember }: ExpenseFormProps) {
  const isEdit = !!expense;
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("living_expenses");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [startAge, setStartAge] = useState("");
  const [endAge, setEndAge] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const ym = youngestMember ?? null;

  useEffect(() => {
    if (open) {
      setLabel(expense?.label || "");
      setCategory(expense?.category || "living_expenses");
      setMonthlyAmount(String(expense?.monthly_amount || ""));

      if (ym) {
        setStartAge(expense?.start_year ? String(expense.start_year - ym.birthYear) : "");
        setEndAge(expense?.end_year ? String(expense.end_year - ym.birthYear) : "");
      } else {
        setStartAge(expense?.start_year ? String(expense.start_year) : "");
        setEndAge(expense?.end_year ? String(expense.end_year) : "");
      }
      setStartNow(false);
      setNotes(expense?.notes || "");
    }
  }, [open, expense, ym]);

  useEffect(() => {
    if (startNow && ym) {
      setStartAge(String(ym.currentAge));
    }
  }, [startNow, ym]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    setSaving(true);
    const supabase = createClient();

    let startYear: number | null = null;
    let endYear: number | null = null;
    if (ym) {
      startYear = startAge ? ym.birthYear + parseInt(startAge) : null;
      endYear = endAge ? ym.birthYear + parseInt(endAge) : null;
    } else {
      startYear = startAge ? parseInt(startAge) : null;
      endYear = endAge ? parseInt(endAge) : null;
    }

    const payload = {
      family_id: familyId,
      label: label.trim(),
      category,
      monthly_amount: parseFloat(monthlyAmount) || 0,
      start_year: startYear,
      end_year: endYear,
      notes: notes.trim() || null,
    };

    if (isEdit && expense) {
      await supabase.from("expenses").update(payload).eq("id", expense.id);
    } else {
      await supabase.from("expenses").insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Expense" : "Add Expense"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <InputField
          label="Label"
          id="expense-label"
          placeholder="e.g. Monthly groceries"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <SelectField
            label="Category"
            id="expense-category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <CurrencyInput
            label="Monthly Amount (R)"
            id="expense-amount"
            value={monthlyAmount}
            onChange={setMonthlyAmount}
            required
          />
        </div>

        {ym && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", margin: 0 }}>
            {ym.name} is currently {ym.currentAge} years old
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <div>
            <InputField
              label={ym ? "Start Age" : "Start Year"}
              id="expense-start"
              type="number"
              min={ym ? "0" : "2000"}
              max={ym ? "120" : "2100"}
              placeholder={ym ? `e.g. ${ym.currentAge}` : "Optional"}
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
            label={ym ? "End Age" : "End Year"}
            id="expense-end"
            type="number"
            min={ym ? "0" : "2000"}
            max={ym ? "120" : "2100"}
            placeholder="Optional"
            value={endAge}
            onChange={(e) => setEndAge(e.target.value)}
          />
        </div>
        <TextareaField
          label="Notes"
          id="expense-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
