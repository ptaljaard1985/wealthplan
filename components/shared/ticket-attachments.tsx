"use client";

import { useEffect, useState, useRef } from "react";
import { Paperclip, FileText, Image, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatFileSize, formatRelativeTime } from "@/lib/formatters";
import type { TicketAttachment } from "@/lib/types/database";

interface TicketAttachmentsProps {
  ticketId: string;
  canUpload: boolean;
  canDelete: boolean;
}

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return <Image size={14} />;
  if (contentType.startsWith("text/") || contentType.includes("pdf")) return <FileText size={14} />;
  return <Paperclip size={14} />;
}

export function TicketAttachments({ ticketId, canUpload, canDelete }: TicketAttachmentsProps) {
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchAttachments() {
    const supabase = createClient();
    const { data } = await supabase
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setAttachments(data);
  }

  useEffect(() => {
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function handleUpload() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      const storagePath = `${ticketId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("ticket-attachments")
        .upload(storagePath, file);

      if (!uploadErr) {
        await supabase.from("ticket_attachments").insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
          storage_path: storagePath,
          uploaded_by: user.id,
        });
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    fetchAttachments();
  }

  async function handleDownload(att: TicketAttachment) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("ticket-attachments")
      .createSignedUrl(att.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function handleDelete(att: TicketAttachment) {
    const supabase = createClient();
    await supabase.storage.from("ticket-attachments").remove([att.storage_path]);
    await supabase.from("ticket_attachments").delete().eq("id", att.id);
    fetchAttachments();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <p
        className="label"
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", margin: 0 }}
      >
        <Paperclip size={14} />
        Attachments
        {attachments.length > 0 && (
          <span
            className="badge"
            style={{ fontSize: "var(--text-xs)", marginLeft: "var(--space-1)" }}
          >
            {attachments.length}
          </span>
        )}
      </p>

      {attachments.length === 0 && (
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--gray-400)",
            fontStyle: "italic",
          }}
        >
          No attachments yet.
        </p>
      )}

      {attachments.map((att) => (
        <div
          key={att.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-sm)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--gray-50)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {fileIcon(att.content_type)}
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {att.file_name}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", whiteSpace: "nowrap" }}>
            {formatFileSize(att.file_size)}
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", whiteSpace: "nowrap" }}>
            {formatRelativeTime(att.created_at)}
          </span>
          <button
            type="button"
            onClick={() => handleDownload(att)}
            title="Download"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--gray-500)",
            }}
          >
            <Download size={14} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => handleDelete(att)}
              title="Delete"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--error-500)",
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {canUpload && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ fontSize: "var(--text-sm)", flex: 1 }}
          />
          <Button variant="secondary" size="sm" loading={uploading} onClick={handleUpload}>
            Attach
          </Button>
        </div>
      )}
    </div>
  );
}
