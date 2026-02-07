"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { FamilyMember, Account, Income } from "@/lib/types/database";

interface MemberFull extends FamilyMember {
  income: Income[];
  accounts: Account[];
}

export default function RetirementPage() {
  const { id } = useParams();
  const [members, setMembers] = useState<MemberFull[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("family_members")
      .select("*, accounts(*), income(*)")
      .eq("family_id", id as string);
    if (data) setMembers(data as MemberFull[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retirementAccounts = members.flatMap((m) =>
    m.accounts
      .filter((a) => a.account_type === "retirement")
      .map((a) => ({ ...a, memberName: m.first_name }))
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Retirement Planning" />
        <div style={{ padding: "var(--space-6)", color: "var(--gray-400)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Retirement Planning" />

      {retirementAccounts.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No retirement accounts"
          body="Add retirement accounts in the Assets tab to start planning."
        />
      ) : (
        <div style={{ padding: "var(--space-4) 0" }}>
          <p style={{ color: "var(--gray-500)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Retirement planning — living annuity conversion modelling, drawdown rates, and lump sum tax analysis.
            Details coming soon.
          </p>

          <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {members.filter((m) => m.accounts.some((a) => a.account_type === "retirement")).map((member) => {
              const retAccs = member.accounts.filter((a) => a.account_type === "retirement");
              return (
                <div
                  key={member.id}
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "12px",
                    padding: "var(--space-5)",
                  }}
                >
                  <h3 style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-base)", fontWeight: 700 }}>
                    {member.first_name} {member.last_name}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {retAccs.map((acc) => (
                      <div
                        key={acc.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "var(--space-2) var(--space-3)",
                          background: "rgba(172, 145, 33, 0.06)",
                          borderRadius: "8px",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{acc.account_name}</span>
                        <span style={{ color: "var(--gray-600)" }}>
                          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(acc.current_value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
