"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Wallet, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountTypeBadge } from "@/components/ui/badge";
import { AccountForm } from "@/components/accounts/account-form";
import { ValuationsPanel } from "@/components/accounts/valuations-panel";
import { formatCurrency, formatPercentage, formatCurrencyCompact } from "@/lib/formatters";
import type { FamilyMember, Account } from "@/lib/types/database";

interface MemberWithAccounts extends FamilyMember {
  accounts: Account[];
}

export default function AssetsPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [members, setMembers] = useState<MemberWithAccounts[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [defaultMemberId, setDefaultMemberId] = useState<string>("");
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("family_members")
      .select("*, accounts(*)")
      .eq("family_id", familyId)
      .order("created_at");

    if (data) setMembers(data as MemberWithAccounts[]);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(accountId: string) {
    if (!confirm("Delete this account? This will also remove all valuations.")) return;
    const supabase = createClient();
    await supabase.from("accounts").delete().eq("id", accountId);
    fetchData();
  }

  const allMembers = members as FamilyMember[];
  const totalValue = members.reduce(
    (sum, m) => sum + m.accounts.reduce((s, a) => s + Number(a.current_value), 0),
    0
  );

  return (
    <>
      <PageHeader
        title="Assets"
        subtitle={`Total portfolio: ${formatCurrency(totalValue)}`}
        action={
          allMembers.length > 0 ? (
            <Button variant="primary" onClick={() => { setEditingAccount(null); setDefaultMemberId(""); setShowForm(true); }}>
              <Plus size={16} /> Add Account
            </Button>
          ) : undefined
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Wallet}
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
                onClick={() => { setEditingAccount(null); setDefaultMemberId(member.id); setShowForm(true); }}
              >
                <Plus size={14} /> Add Account
              </Button>
            </div>

            {member.accounts.length === 0 ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>No accounts yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Current Value</th>
                    <th>Details</th>
                    <th>Return / Appr.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {member.accounts.map((acc) => (
                    <React.Fragment key={acc.id}>
                      <tr>
                        <td>
                          <button
                            className="btn-ghost"
                            style={{ padding: "2px" }}
                            onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                          >
                            {expandedAccount === acc.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: 500 }}>{acc.account_name}</td>
                        <td><AccountTypeBadge type={acc.account_type} isJoint={acc.is_joint} /></td>
                        <td style={{ fontWeight: 500 }}>{formatCurrency(acc.current_value)}</td>
                        <td style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
                          {acc.account_type === "property" ? (
                            <span>
                              {acc.rental_income_monthly ? `Rental ${formatCurrencyCompact(acc.rental_income_monthly)}/mo` : "No rental"}
                              {acc.planned_sale_year ? ` · Sale ${acc.planned_sale_year}` : ""}
                            </span>
                          ) : (
                            <span>{formatCurrency(acc.monthly_contribution)}/mo</span>
                          )}
                        </td>
                        <td>{formatPercentage(acc.expected_return_pct)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "2px" }}>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingAccount(acc); setShowForm(true); }}>
                              <Pencil size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(acc.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedAccount === acc.id && (
                        <tr key={`${acc.id}-val`}>
                          <td colSpan={7} style={{ padding: "0 var(--space-4) var(--space-4)" }}>
                            <ValuationsPanel accountId={acc.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}

      <AccountForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingAccount(null); }}
        onSaved={fetchData}
        members={allMembers}
        account={editingAccount}
        defaultMemberId={defaultMemberId}
      />
    </>
  );
}
