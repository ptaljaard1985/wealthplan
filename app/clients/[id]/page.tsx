"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Users2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EditFamilyForm } from "@/components/families/edit-family-form";
import { MemberCard } from "@/components/members/member-card";
import { MemberForm } from "@/components/members/member-form";
import { formatPercentage } from "@/lib/formatters";
import type { ClientFamily, FamilyMember } from "@/lib/types/database";

export default function InformationPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<ClientFamily | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [editingFamily, setEditingFamily] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [familyRes, membersRes] = await Promise.all([
      supabase.from("client_families").select("*").eq("id", familyId).single(),
      supabase.from("family_members").select("*").eq("family_id", familyId).order("created_at"),
    ]);

    if (familyRes.data) setFamily(familyRes.data);
    if (membersRes.data) setMembers(membersRes.data);
  }, [familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeleteMember(memberId: string) {
    if (!confirm("Remove this family member? This will also delete their accounts and income.")) return;
    const supabase = createClient();
    await supabase.from("family_members").delete().eq("id", memberId);
    fetchData();
  }

  if (!family) return null;

  return (
    <>
      <PageHeader title="Information" subtitle="Family details and members" />

      {/* Family Info */}
      <Card>
        {editingFamily ? (
          <EditFamilyForm
            family={family}
            onSaved={() => {
              setEditingFamily(false);
              fetchData();
            }}
            onCancel={() => setEditingFamily(false)}
          />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>{family.family_name}</h2>
                <div style={{ display: "flex", gap: "var(--space-6)", marginTop: "var(--space-3)" }}>
                  <div>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Inflation Rate
                    </span>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, marginTop: "2px" }}>
                      {formatPercentage(family.inflation_rate_pct)}
                    </div>
                  </div>
                </div>
                {family.notes && (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginTop: "var(--space-3)" }}>
                    {family.notes}
                  </p>
                )}
              </div>
              <Button variant="ghost" onClick={() => setEditingFamily(true)}>
                <Pencil size={14} />
                Edit
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Members */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>
            Family Members ({members.length}/2)
          </h2>
          {members.length < 2 && (
            <Button variant="secondary" size="sm" onClick={() => { setEditingMember(null); setShowMemberForm(true); }}>
              <Plus size={14} />
              Add Member
            </Button>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No members added"
            body="Add up to two family members to begin planning."
            action={
              <Button variant="primary" onClick={() => { setEditingMember(null); setShowMemberForm(true); }}>
                <Plus size={16} />
                Add Member
              </Button>
            }
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onEdit={() => {
                  setEditingMember(m);
                  setShowMemberForm(true);
                }}
                onDelete={() => handleDeleteMember(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MemberForm
        open={showMemberForm}
        onClose={() => { setShowMemberForm(false); setEditingMember(null); }}
        onSaved={fetchData}
        familyId={familyId}
        member={editingMember}
      />
    </>
  );
}
