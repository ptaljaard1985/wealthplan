"use client";

import { Pencil, Trash2, Mail, Phone, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, calculateAge } from "@/lib/formatters";
import type { FamilyMember } from "@/lib/types/database";

interface MemberCardProps {
  member: FamilyMember;
  onEdit: () => void;
  onDelete: () => void;
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const age = member.date_of_birth ? calculateAge(member.date_of_birth) : null;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>
            {member.first_name} {member.last_name}
          </h3>
          {age !== null && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginTop: "2px" }}>
              Age {age}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-1)" }}>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-3)",
          marginTop: "var(--space-4)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        {member.email && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
            <Mail size={14} />
            {member.email}
          </div>
        )}
        {member.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
            <Phone size={14} />
            {member.phone}
          </div>
        )}
        {member.date_of_birth && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
            <Calendar size={14} />
            {formatDate(member.date_of_birth)}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
          <Target size={14} />
          Retires at {member.retirement_age}
        </div>
      </div>

      {member.notes && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginTop: "var(--space-3)" }}>
          {member.notes}
        </p>
      )}
    </Card>
  );
}
