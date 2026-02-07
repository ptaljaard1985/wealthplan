"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Flag, Pencil, Trash2, Briefcase, Home, GraduationCap, Heart, Plane, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EventForm, getIconColor } from "@/components/events/event-form";
import type { LifeEvent, FamilyMember } from "@/lib/types/database";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  milestone: Flag,
  retire: Briefcase,
  home: Home,
  education: GraduationCap,
  medical: Heart,
  travel: Plane,
  gift: Gift,
};

export default function EventsPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [items, setItems] = useState<LifeEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LifeEvent | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: evData }, { data: memData }] = await Promise.all([
      supabase.from("events").select("*").eq("family_id", familyId).order("event_year"),
      supabase.from("family_members").select("*").eq("family_id", familyId).order("created_at"),
    ]);

    if (evData) setItems(evData);
    if (memData) setMembers(memData);
    setLoading(false);
  }, [familyId]);

  const youngestMember = (() => {
    const withDob = members.filter((m) => m.date_of_birth);
    if (withDob.length === 0) return null;
    const y = withDob.reduce((a, b) => (a.date_of_birth! > b.date_of_birth! ? a : b));
    const birthYear = new Date(y.date_of_birth!).getFullYear();
    return { name: y.first_name, birthYear, currentAge: new Date().getFullYear() - birthYear };
  })();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", id);
    fetchData();
  }

  if (loading) return null;

  return (
    <>
      <PageHeader
        title="Life Events"
        subtitle="Mark key milestones on the projection timeline"
        action={
          <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} /> Add Event
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No events"
          body="Add life events like retirement, property sales, or other milestones to mark them on the charts."
          action={
            <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={16} /> Add Event
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>{youngestMember ? "Age" : "Year"}</th>
                <th>Category</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => {
                const IconComp = ICON_MAP[ev.icon] || Flag;
                const color = ev.color || getIconColor(ev.icon);
                const displayAge = youngestMember
                  ? ev.event_year - youngestMember.birthYear
                  : ev.event_year;
                return (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.label}</td>
                    <td>{displayAge}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color }}>
                        <IconComp size={14} />
                        {ev.icon.charAt(0).toUpperCase() + ev.icon.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>{ev.notes || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(ev); setShowForm(true); }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ev.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <EventForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={fetchData}
        familyId={familyId}
        event={editing}
        youngestMember={youngestMember}
      />
    </>
  );
}
