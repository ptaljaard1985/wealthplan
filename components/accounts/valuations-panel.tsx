"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Valuation } from "@/lib/types/database";

interface ValuationsPanelProps {
  accountId: string;
}

export function ValuationsPanel({ accountId }: ValuationsPanelProps) {
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchValuations = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("valuations")
      .select("*")
      .eq("account_id", accountId)
      .order("valuation_date", { ascending: false });
    if (data) setValuations(data);
  }, [accountId]);

  useEffect(() => {
    fetchValuations();
  }, [fetchValuations]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !value) return;

    setSaving(true);
    const supabase = createClient();
    await supabase.from("valuations").insert({
      account_id: accountId,
      valuation_date: date,
      value: parseFloat(value) || 0,
      notes: notes.trim() || null,
    });
    setSaving(false);
    setShowForm(false);
    setDate("");
    setValue("");
    setNotes("");
    fetchValuations();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("valuations").delete().eq("id", id);
    fetchValuations();
  }

  return (
    <div style={{ padding: "var(--space-4)", background: "var(--surface-sunken)", borderRadius: "8px", marginTop: "var(--space-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-700)" }}>Valuations</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "120px" }}>
            <InputField id="val-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div style={{ flex: "1", minWidth: "120px" }}>
            <CurrencyInput id="val-value" placeholder="Value (R)" value={value} onChange={setValue} required />
          </div>
          <div style={{ flex: "2", minWidth: "150px" }}>
            <TextareaField id="val-notes" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: "38px" }} />
          </div>
          <Button variant="primary" size="sm" type="submit" loading={saving}>Save</Button>
        </form>
      )}

      {valuations.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>No valuations recorded.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {valuations.map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.valuation_date)}</td>
                <td style={{ fontWeight: 500 }}>{formatCurrency(v.value)}</td>
                <td style={{ color: "var(--gray-500)" }}>{v.notes || "—"}</td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
