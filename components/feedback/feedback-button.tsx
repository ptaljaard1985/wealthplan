"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FeedbackModal } from "./feedback-modal";

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthenticated(!!user);
    });
  }, []);

  if (!authenticated) return null;

  return (
    <>
      <button
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <MessageSquarePlus size={22} />
      </button>
      <FeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        screenPath={pathname}
      />
    </>
  );
}
