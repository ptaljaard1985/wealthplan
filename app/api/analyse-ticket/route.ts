import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseTicket } from "@/lib/ai/analyse-ticket";

export async function POST(req: NextRequest) {
  const { requestId } = await req.json();
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the ticket
  const { data: ticket, error: fetchErr } = await supabase
    .from("support_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Authorize: must be ticket owner or admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isOwner = ticket.user_id === user.id;
  const isAdmin = profile?.is_admin === true;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Set status to analyzing
  await supabase
    .from("support_requests")
    .update({ ai_analysis_status: "analyzing" })
    .eq("id", requestId);

  try {
    const analysis = await analyseTicket({
      request_type: ticket.request_type,
      details: ticket.details,
      screen_path: ticket.screen_path,
    });

    await supabase
      .from("support_requests")
      .update({
        ai_summary: analysis.summary,
        ai_affected_areas: JSON.stringify(analysis.affectedAreas),
        ai_implementation: JSON.stringify(analysis.implementation),
        ai_analysis_status: "done",
      })
      .eq("id", requestId);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("AI analysis failed:", err);

    await supabase
      .from("support_requests")
      .update({ ai_analysis_status: "error" })
      .eq("id", requestId);

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
