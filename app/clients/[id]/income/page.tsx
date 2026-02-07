"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IncomeCategoryBadge } from "@/components/ui/badge";
import { IncomeForm } from "@/components/income/income-form";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import type { FamilyMember, Income } from "@/lib/types/database";

interface MemberWithIncome extends FamilyMember {
  income: Income[];
}

export default function IncomePage() {
  const params = useParams();
  const familyId = params.id as string;

  const [members, setMembers] = useState<MemberWithIncome[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [defaultMemberId, setDefaultMemberId] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("family_members")
      .select("*, income(*)")
      .eq("family_id", familyId)
      .order("created_at");

    if (data) setMembers(data as MemberWithIncome[]);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(incomeId: string) {
    if (!confirm("Delete this income item?")) return;
    const supabase = createClient();
    await supabase.from("income").delete().eq("id", incomeId);
    fetchData();
  }

  const allMembers = members as FamilyMember[];

  return (
    <>
      <PageHeader
        title="Income"
        subtitle="Income sources per family member"
        action={
          allMembers.length > 0 ? (
            <Button variant="primary" onClick={() => { setEditingIncome(null); setDefaultMemberId(""); setShowForm(true); }}>
              <Plus size={16} /> Add Income
            </Button>
          ) : undefined
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No members yet"
          body="Add family members on the Information page first."
        />
      ) : (
        members.map((member) => (
          <Card key={member.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>
                {member.first_name} {member.last_name}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setEditingIncome(null); setDefaultMemberId(member.id); setShowForm(true); }}
              >
                <Plus size={14} /> Add Income
              </Button>
            </div>

            {member.income.length === 0 ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>No income items yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Category</th>
                    <th>Monthly Amount</th>
                    <th>Taxable</th>
                    <th>Start</th>
                    <th>End</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {member.income.map((inc) => (
                    <tr key={inc.id}>
                      <td style={{ fontWeight: 500 }}>{inc.label}</td>
                      <td><IncomeCategoryBadge category={inc.category} /></td>
                      <td>{formatCurrency(inc.monthly_amount)}</td>
                      <td>{formatPercentage(inc.taxable_pct, 0)}</td>
                      <td style={{ color: "var(--gray-500)" }}>{inc.start_year || "—"}</td>
                      <td style={{ color: "var(--gray-500)" }}>{inc.end_year || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingIncome(inc); setShowForm(true); }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(inc.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}

      <IncomeForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingIncome(null); }}
        onSaved={fetchData}
        members={allMembers}
        income={editingIncome}
        defaultMemberId={defaultMemberId}
      />
    </>
  );
}
