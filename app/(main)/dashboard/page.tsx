"use client";

import { useEffect, useState, useCallback } from "react";
import { Users2, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { FamilyCard } from "@/components/families/family-card";
import { AddFamilyModal } from "@/components/families/add-family-modal";

interface FamilySummary {
  id: string;
  family_name: string;
  inflation_rate_pct: number;
  notes: string | null;
  created_at: string;
  memberCount: number;
  totalValue: number;
}

export default function DashboardPage() {
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchFamilies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_families")
      .select("*, family_members(id, accounts(current_value))")
      .order("family_name");

    if (!error && data) {
      const summaries: FamilySummary[] = data.map((f: Record<string, unknown>) => {
        const members = (f.family_members as Record<string, unknown>[]) || [];
        let totalValue = 0;
        for (const m of members) {
          const accounts = (m.accounts as { current_value: number }[]) || [];
          for (const a of accounts) {
            totalValue += Number(a.current_value) || 0;
          }
        }
        return {
          id: f.id as string,
          family_name: f.family_name as string,
          inflation_rate_pct: f.inflation_rate_pct as number,
          notes: f.notes as string | null,
          created_at: f.created_at as string,
          memberCount: members.length,
          totalValue,
        };
      });
      setFamilies(summaries);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="dash-page">
      {/* Branded header section */}
      <div className="dash-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
              <div className="dash-logo">
                <TrendingUp size={18} color="#fff" />
              </div>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-500)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Wealth Projector
              </span>
            </div>
            <h1 className="dash-title">{greeting}</h1>
            <p style={{ fontSize: "var(--text-base)", color: "var(--gray-500)", margin: "var(--space-2) 0 0 0", lineHeight: 1.5 }}>
              Manage your client family portfolios
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAdd(true)} className="dash-add-btn">
            <Plus size={16} />
            Add Family
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : families.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No client families yet"
          body="Add your first client family to get started with financial planning."
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              Add Family
            </Button>
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "var(--space-5)" }}>
          {families.map((f, i) => (
            <FamilyCard
              key={f.id}
              id={f.id}
              familyName={f.family_name}
              memberCount={f.memberCount}
              totalValue={f.totalValue}
              createdAt={f.created_at}
              index={i}
            />
          ))}
        </div>
      )}

      <AddFamilyModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchFamilies}
      />

      <style>{dashStyles}</style>
    </div>
  );
}

const dashStyles = `
  .dash-page {
    margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-8));
    padding: 0;
    min-height: 100%;
    background: linear-gradient(180deg, #faf8f3 0%, #f5f0e8 50%, #ede7db 100%);
  }

  .dash-header {
    padding: var(--space-8) var(--space-8) var(--space-6);
    border-bottom: 1px solid rgba(172, 145, 33, 0.1);
    background: linear-gradient(135deg, rgba(172, 145, 33, 0.04) 0%, rgba(201, 130, 43, 0.03) 100%);
  }

  .dash-logo {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, #ac9121 0%, #c9a82e 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(172, 145, 33, 0.25);
  }

  .dash-title {
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin: 0;
    background: linear-gradient(135deg, var(--gray-900) 0%, #4a3d28 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .dash-add-btn {
    box-shadow: 0 2px 12px rgba(172, 145, 33, 0.2);
    transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease !important;
  }
  .dash-add-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 20px rgba(172, 145, 33, 0.3) !important;
  }

  .dash-page > div:last-of-type:not(.dash-header) {
    padding: var(--space-6) var(--space-8) var(--space-8);
  }

  /* Grid containers */
  .dash-page > div[style*="grid"] {
    padding: var(--space-6) var(--space-8) var(--space-8);
  }
`;
