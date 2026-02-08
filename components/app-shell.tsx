"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/hooks/use-admin";

const navItems = [
  { href: "/dashboard", label: "Client Families", icon: LayoutDashboard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAdmin();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{ display: "none" }} data-sidebar="main">
        <div className="sidebar-title">Wealth Projector</div>
        <div className="sidebar-section">Workspace</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
          {isAdmin && (
            <Link
              href="/admin"
              className={`nav-link ${pathname === "/admin" ? "nav-link-active" : ""}`}
            >
              <Shield size={18} />
              Admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="nav-link"
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 768px) {
          [data-sidebar="main"] { display: flex !important; }
        }
      `}</style>

      <main style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "var(--space-6) var(--space-8)" }}>
          <div className="page-stack">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
