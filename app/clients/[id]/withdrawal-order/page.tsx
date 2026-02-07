"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { FamilyMember, Account } from "@/lib/types/database";

interface MemberWithAccounts extends FamilyMember {
  accounts: Account[];
}

export default function WithdrawalOrderPage() {
  const { id } = useParams();
  const [members, setMembers] = useState<MemberWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("family_members")
      .select("*, accounts(*)")
      .eq("family_id", id as string);
    if (data) setMembers(data as MemberWithAccounts[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allAccounts = members.flatMap((m) =>
    m.accounts.map((a) => ({ ...a, memberName: m.first_name }))
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Withdrawal Order" />
        <div style={{ padding: "var(--space-6)", color: "var(--gray-400)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Withdrawal Order" />

      {allAccounts.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No accounts to sequence"
          body="Add accounts in the Assets tab to plan withdrawal order."
        />
      ) : (
        <div style={{ padding: "var(--space-4) 0" }}>
          <p style={{ color: "var(--gray-500)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Optimal withdrawal sequencing to minimise tax and maximise portfolio longevity.
            Details coming soon.
          </p>

          <div style={{ marginTop: "var(--space-5)" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600, color: "var(--gray-500)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Priority
                    </th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600, color: "var(--gray-500)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Account
                    </th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600, color: "var(--gray-500)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Member
                    </th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600, color: "var(--gray-500)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Type
                    </th>
                    <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)", fontWeight: 600, color: "var(--gray-500)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Default order: tax-free first, then non-retirement, then retirement (preserves tax-advantaged growth longest) */}
                  {[...allAccounts]
                    .sort((a, b) => {
                      const order: Record<string, number> = { "tax-free": 1, "non-retirement": 2, property: 3, retirement: 4 };
                      return (order[a.account_type] || 5) - (order[b.account_type] || 5);
                    })
                    .map((acc, i) => (
                      <tr key={acc.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700, color: "var(--brand-600)" }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>
                          {acc.account_name}
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--gray-600)" }}>
                          {acc.memberName}
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              background:
                                acc.account_type === "retirement"
                                  ? "rgba(172,145,33,0.12)"
                                  : acc.account_type === "tax-free"
                                  ? "rgba(47,148,100,0.12)"
                                  : acc.account_type === "property"
                                  ? "rgba(201,130,43,0.12)"
                                  : "rgba(47,111,189,0.12)",
                              color:
                                acc.account_type === "retirement"
                                  ? "#8a7419"
                                  : acc.account_type === "tax-free"
                                  ? "#1a5e3a"
                                  : acc.account_type === "property"
                                  ? "#7a4a1e"
                                  : "#1e4a7a",
                            }}
                          >
                            {acc.account_type}
                          </span>
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", fontWeight: 600 }}>
                          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(acc.current_value)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: "var(--space-4)", color: "var(--gray-400)", fontSize: "var(--text-xs)", lineHeight: 1.5 }}>
              Default order: Tax-free accounts first (no tax on withdrawals), then discretionary/non-retirement,
              then property, then retirement funds last (preserves tax-advantaged compound growth longest).
              Custom ordering and scenario modelling coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
