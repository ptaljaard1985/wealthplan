"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types/database";

export function useAdmin() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Try to fetch existing profile
      let { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Auto-create profile if none exists (pre-migration users)
      if (!profile) {
        const { data: upserted } = await supabase
          .from("user_profiles")
          .upsert({
            id: user.id,
            email: user.email!,
            display_name: user.user_metadata?.full_name || user.email!.split("@")[0],
          })
          .select()
          .single();
        profile = upserted;
      }

      if (profile) {
        setUserProfile(profile as UserProfile);
        setIsAdmin((profile as UserProfile).is_admin);
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  return { isAdmin, userProfile, loading };
}
