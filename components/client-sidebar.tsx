"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Wallet,
  TrendingUp,
  Receipt,
  Landmark,
  LineChart,
  SlidersHorizontal,
  Calculator,
} from "lucide-react";
import type { ClientFamily } from "@/lib/types/database";

interface ClientSidebarProps {
  family: ClientFamily;
}

export function ClientSidebar({ family }: ClientSidebarProps) {
  const pathname = usePathname();
  const base = `/clients/${family.id}`;

  const navItems = [
    { href: base, label: "Information", icon: FileText, exact: true },
    { href: `${base}/assets`, label: "Assets", icon: Wallet },
    { href: `${base}/income`, label: "Income", icon: TrendingUp },
    { href: `${base}/expenses`, label: "Expenses", icon: Receipt },
    { href: `${base}/capital-expenses`, label: "Capital Expenses", icon: Landmark },
    { href: `${base}/projections`, label: "Projections", icon: LineChart },
    { href: `${base}/scenarios`, label: "Scenarios", icon: SlidersHorizontal },
    { href: `${base}/tax`, label: "Tax View", icon: Calculator },
  ];

  return (
    <aside className="sidebar" style={{ display: "none" }} data-sidebar="client">
      <Link
        href="/dashboard"
        className="nav-link"
        style={{ marginBottom: "var(--space-4)", color: "var(--gray-500)", fontSize: "var(--text-xs)" }}
      >
        <ArrowLeft size={14} />
        All Clients
      </Link>

      <div className="sidebar-title" style={{ marginBottom: "var(--space-2)" }}>
        {family.family_name}
      </div>

      <div className="sidebar-section">Planning</div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 768px) {
          [data-sidebar="client"] { display: flex !important; }
        }
      `}</style>
    </aside>
  );
}
