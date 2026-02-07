"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, TextareaField } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { CapitalExpense } from "@/lib/types/database";

interface CapitalExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  familyId: string;
  capitalExpense?: CapitalExpense | null;
  youngestMember?: { name: string; birthYear: number; currentAge: number } | null;
}

export function CapitalExpenseForm({ open, onClose, onSaved, familyId, capitalExpense, youngestMember }: CapitalExpenseFormProps) {
  const isEdit = !!capitalExpense;
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [startAge, setStartAge] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [intervalYears, setIntervalYears] = useState("");
  const [count, setCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const ym = youngestMember ?? null;

  useEffect(() => {
    if (open) {
      setLabel(capitalExpense?.label || "");
      setAmount(String(capitalExpense?.amount || ""));

      if (ym) {
        const age = capitalExpense?.start_year
          ? String(capitalExpense.start_year - ym.birthYear)
          : String(ym.currentAge);
        setStartAge(age);
      } else {
        setStartAge(String(capitalExpense?.start_year || new Date().getFullYear()));
      }

      setStartNow(false);
      setIntervalYears(capitalExpense?.recurrence_interval_years ? String(capitalExpense.recurrence_interval_years) : "");
      setCount(String(capitalExpense?.recurrence_count || "1"));
      setNotes(capitalExpense?.notes || "");
    }
  }, [open, capitalExpense, ym]);

  useEffect(() => {
    if (startNow && ym) {
      setStartAge(String(ym.currentAge));
    }
  }, [startNow, ym]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount) return;

    setSaving(true);
    const supabase = createClient();

    let startYear: number;
    if (ym) {
      startYear = startAge ? ym.birthYear + parseInt(startAge) : new Date().getFullYear();
    } else {
      startYear = parseInt(startAge) || new Date().getFullYear();
    }

    const payload = {
      family_id: familyId,
      label: label.trim(),
      amount: parseFloat(amount) || 0,
      start_year: startYear,
      recurrence_interval_years: intervalYears ? parseInt(intervalYears) : null,
      recurrence_count: parseInt(count) || 1,
      notes: notes.trim() || null,
    };

    if (isEdit && capitalExpense) {
      await supabase.from("capital_expenses").update(payload).eq("id", capitalExpense.id);
    } else {
      await supabase.from("capital_expenses").insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Capital Expense" : "Add Capital Expense"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <InputField
          label="Label"
          id="capex-label"
          placeholder="e.g. Vehicle replacement"
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
          <CurrencyInput
            label="Amount (R)"
            id="capex-amount"
            value={amount}
            onChange={setAmount}
            required
          />
          <div>
            <InputField
              label={ym ? "Start Age" : "Start Year"}
              id="capex-start"
              type="number"
              min={ym ? "0" : "2000"}
              max={ym ? "120" : "2100"}
              placeholder={ym ? `e.g. ${ym.currentAge}` : String(new Date().getFullYear())}
              value={startAge}
              onChange={(e) => { setStartAge(e.target.value); setStartNow(false); }}
              disabled={startNow}
              required
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <InputField
            label="Every X Years (blank = once)"
            id="capex-interval"
            type="number"
            min="1"
            max="50"
            placeholder="e.g. 5"
            value={intervalYears}
            onChange={(e) => setIntervalYears(e.target.value)}
          />
          <InputField
            label="Number of Times"
            id="capex-count"
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
        <TextareaField
          label="Notes"
          id="capex-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Capital Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
