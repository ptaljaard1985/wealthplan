"use client";

import Link from "next/link";
import { Users2, ChevronRight, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface FamilyCardProps {
  id: string;
  familyName: string;
  memberCount: number;
  totalValue: number;
  createdAt: string;
  index?: number;
}

const cardGradients = [
  "linear-gradient(135deg, #ac9121 0%, #d4b84a 100%)",
  "linear-gradient(135deg, #1a5e3a 0%, #2f9464 100%)",
  "linear-gradient(135deg, #1e4a7a 0%, #2f6fbd 100%)",
  "linear-gradient(135deg, #7a4a1e 0%, #c9822b 100%)",
];

export function FamilyCard({
  id,
  familyName,
  memberCount,
  totalValue,
  createdAt,
  index = 0,
}: FamilyCardProps) {
  const gradient = cardGradients[index % cardGradients.length];

  return (
    <Link href={`/clients/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        className="family-card"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {/* Gradient accent strip */}
        <div className="family-card-accent" style={{ background: gradient }} />
        {/* Decorative circle */}
        <div className="family-card-circle" style={{ background: gradient, opacity: 0.06 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>{familyName}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>
              <Users2 size={14} />
              <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
            </div>
          </div>
          <ChevronRight size={18} className="family-card-arrow" />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "var(--space-5)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--border-default)",
            position: "relative",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Portfolio
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
              <TrendingUp size={14} style={{ color: "var(--brand-600)" }} />
              <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--brand-700)" }}>
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Created
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)", marginTop: "var(--space-1)" }}>
              {formatDate(createdAt)}
            </div>
          </div>
        </div>
      </div>

      <style>{familyCardStyles}</style>
    </Link>
  );
}

const familyCardStyles = `
  .family-card {
    background: #fff;
    border-radius: 14px;
    padding: var(--space-5) var(--space-6);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
    transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease;
    animation: familyCardFadeIn 500ms ease both;
    border: 1px solid rgba(0,0,0,0.04);
  }
  .family-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 12px 32px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
  }

  /* Top gradient accent */
  .family-card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 14px 14px 0 0;
  }

  /* Decorative circle */
  .family-card-circle {
    position: absolute;
    top: -30px;
    right: -30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    transition: transform 400ms ease, opacity 400ms ease;
  }
  .family-card:hover .family-card-circle {
    transform: scale(1.6);
    opacity: 0.1 !important;
  }

  /* Arrow nudge */
  .family-card-arrow {
    color: var(--gray-400);
    transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), color 200ms ease;
  }
  .family-card:hover .family-card-arrow {
    transform: translateX(3px);
    color: var(--brand-600);
  }

  @keyframes familyCardFadeIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
