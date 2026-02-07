"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Receipt, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { formatCurrency } from "@/lib/formatters";
import type { Expense, FamilyMember } from "@/lib/types/database";

export default function ExpensesPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: expData }, { data: memData }] = await Promise.all([
      supabase.from("expenses").select("*").eq("family_id", familyId).order("created_at"),
      supabase.from("family_members").select("*").eq("family_id", familyId).order("created_at"),
    ]);

    if (expData) setExpenses(expData);
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

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", expenseId);
    fetchData();
  }

  const totalMonthly = expenses.reduce((sum, e) => sum + Number(e.monthly_amount), 0);

  if (loading) return null;

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`Family monthly expenses: ${formatCurrency(totalMonthly)}`}
        action={
          <Button variant="primary" onClick={() => { setEditingExpense(null); setShowForm(true); }}>
            <Plus size={16} /> Add Expense
          </Button>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          body="Add monthly family expenses to include in projections."
          action={
            <Button variant="primary" onClick={() => { setEditingExpense(null); setShowForm(true); }}>
              <Plus size={16} /> Add Expense
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Category</th>
                <th>Monthly Amount</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 500 }}>{exp.label}</td>
                  <td><Badge>{exp.category.replace("_", " ")}</Badge></td>
                  <td>{formatCurrency(exp.monthly_amount)}</td>
                  <td style={{ color: "var(--gray-500)" }}>{exp.start_year || "—"}</td>
                  <td style={{ color: "var(--gray-500)" }}>{exp.end_year || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(exp); setShowForm(true); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)}>
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

      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingExpense(null); }}
        onSaved={fetchData}
        familyId={familyId}
        expense={editingExpense}
        youngestMember={youngestMember}
      />
    </>
  );
}
