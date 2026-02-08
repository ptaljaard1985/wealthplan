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

  // Fetch text-based attachments (non-fatal)
  const TEXT_CONTENT_TYPES = ["text/", "application/json", "application/xml"];
  const TEXT_EXTENSIONS = [".md", ".log", ".csv", ".txt", ".json", ".xml", ".yml", ".yaml"];
  const MAX_ATTACHMENTS = 5;
  const MAX_CHARS = 2000;

  let attachments: { fileName: string; content: string }[] = [];
  try {
    const { data: files } = await supabase
      .from("ticket_attachments")
      .select("file_name, content_type, storage_path")
      .eq("ticket_id", requestId);

    if (files?.length) {
      const textFiles = files.filter((f) => {
        // Skip AI analysis files to avoid circular context
        if (f.file_name.startsWith("ai-analysis")) return false;
        const ct = f.content_type || "";
        if (TEXT_CONTENT_TYPES.some((t) => ct.startsWith(t))) return true;
        const ext = f.file_name.substring(f.file_name.lastIndexOf(".")).toLowerCase();
        return TEXT_EXTENSIONS.includes(ext);
      }).slice(0, MAX_ATTACHMENTS);

      const downloads = await Promise.allSettled(
        textFiles.map(async (f) => {
          const { data, error } = await supabase.storage
            .from("ticket-attachments")
            .download(f.storage_path);
          if (error || !data) return null;
          const text = await data.text();
          return {
            fileName: f.file_name,
            content: text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n[truncated]" : text,
          };
        }),
      );

      attachments = downloads
        .filter((r): r is PromiseFulfilledResult<{ fileName: string; content: string } | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is { fileName: string; content: string } => v !== null);
    }
  } catch (attErr) {
    console.error("Failed to fetch ticket attachments for analysis:", attErr);
  }

  try {
    const analysis = await analyseTicket({
      request_type: ticket.request_type,
      details: ticket.details,
      screen_path: ticket.screen_path,
      attachments: attachments.length ? attachments : undefined,
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

    // Auto-save analysis as .md attachment (non-fatal)
    try {
      const mdLines = [
        `# AI Analysis`,
        ``,
        `## Summary`,
        analysis.summary,
        ``,
      ];
      if (analysis.affectedAreas?.length) {
        mdLines.push(`## Affected Areas`);
        analysis.affectedAreas.forEach((a: string) => mdLines.push(`- ${a}`));
        mdLines.push(``);
      }
      if (analysis.implementation?.length) {
        mdLines.push(`## Implementation Steps`);
        analysis.implementation.forEach((s: { step: number; description: string; file?: string }) => {
          mdLines.push(`${s.step}. ${s.description}${s.file ? ` (\`${s.file}\`)` : ""}`);
        });
        mdLines.push(``);
      }
      const mdContent = mdLines.join("\n");
      const mdBlob = new Blob([mdContent], { type: "text/markdown" });
      const storagePath = `${requestId}/ai-analysis-${Date.now()}.md`;

      const { error: uploadErr } = await supabase.storage
        .from("ticket-attachments")
        .upload(storagePath, mdBlob);

      if (!uploadErr) {
        await supabase.from("ticket_attachments").insert({
          ticket_id: requestId,
          file_name: `ai-analysis.md`,
          file_size: mdBlob.size,
          content_type: "text/markdown",
          storage_path: storagePath,
          uploaded_by: user.id,
        });
      }
    } catch (mdErr) {
      console.error("Failed to save AI analysis .md attachment:", mdErr);
    }

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
