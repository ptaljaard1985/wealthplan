"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Landmark, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CapitalExpenseForm } from "@/components/capital-expenses/capital-expense-form";
import { formatCurrency } from "@/lib/formatters";
import type { CapitalExpense, FamilyMember } from "@/lib/types/database";

function formatRecurrence(ce: CapitalExpense): string {
  if (!ce.recurrence_interval_years || ce.recurrence_count <= 1) {
    return `Once in ${ce.start_year}`;
  }
  return `Every ${ce.recurrence_interval_years} year${ce.recurrence_interval_years > 1 ? "s" : ""} from ${ce.start_year} (${ce.recurrence_count} times)`;
}

export default function CapitalExpensesPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [items, setItems] = useState<CapitalExpense[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CapitalExpense | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ceData }, { data: memData }] = await Promise.all([
      supabase.from("capital_expenses").select("*").eq("family_id", familyId).order("start_year"),
      supabase.from("family_members").select("*").eq("family_id", familyId).order("created_at"),
    ]);

    if (ceData) setItems(ceData);
    if (memData) setMembers(memData);
    setLoading(false);
  }, [familyId]);

  const youngestMember = (() => {
    const withDob = members.filter((m) => m.date_of_birth);
    if (withDob.length === 0) return null;
    const y = withDob.reduce((a, b) => (a.date_of_birth! > b.date_of_birth! ? a : b));
    const birthYear = new Date(y.date_of_birth!).getFullYear();
    return { name: y.first_name, birthYear, currentAge: new Date().getFullYear() - birthYear };
  })();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this capital expense?")) return;
    const supabase = createClient();
    await supabase.from("capital_expenses").delete().eq("id", id);
    fetchData();
  }

  if (loading) return null;

  return (
    <>
      <PageHeader
        title="Capital Expenses"
        subtitle="Lump-sum expenses with optional recurrence"
        action={
          <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} /> Add Capital Expense
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No capital expenses"
          body="Add lump-sum expenses like vehicle purchases, renovations, or education costs."
          action={
            <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={16} /> Add Capital Expense
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Amount</th>
                <th>Recurrence</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((ce) => (
                <tr key={ce.id}>
                  <td style={{ fontWeight: 500 }}>{ce.label}</td>
                  <td>{formatCurrency(ce.amount)}</td>
                  <td style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
                    {formatRecurrence(ce)}
                  </td>
                  <td style={{ color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>{ce.notes || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(ce); setShowForm(true); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ce.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CapitalExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={fetchData}
        familyId={familyId}
        capitalExpense={editing}
        youngestMember={youngestMember}
      />
    </>
  );
}
