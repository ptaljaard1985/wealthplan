"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { useAdmin } from "@/lib/hooks/use-admin";
import { createClient } from "@/lib/supabase/client";
import type { SupportRequest } from "@/lib/types/database";

export default function AdminPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as SupportRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    fetchRequests();
  }, [isAdmin, adminLoading, router, fetchRequests]);

  if (adminLoading || loading) {
    return (
      <>
        <PageHeader title="Admin" subtitle="Support requests" />
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      </>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle={`${requests.length} support request${requests.length !== 1 ? "s" : ""}`}
      />
      <KanbanBoard requests={requests} onRefresh={fetchRequests} />
    </>
  );
}
