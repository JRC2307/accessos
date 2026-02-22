"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { listEvents } from "@/lib/supabase/events";

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function redirect() {
      if (!supabase) {
        setMessage("Supabase not configured.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData?.user) {
        router.replace("/login");
        return;
      }

      const { data: events, error } = await listEvents(supabase);
      if (error) {
        setMessage(error);
        router.replace("/events");
        return;
      }

      const now = new Date();
      const active = events.find((event) => {
        const start = new Date(event.starts_at);
        const end = new Date(event.ends_at);
        return start <= now && now <= end;
      });

      if (active) {
        router.replace(`/events/${active.id}`);
        return;
      }

      router.replace("/events");
    }

    void redirect();
  }, [router, supabase]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <p className="text-sm text-slate-400">{message}</p>
    </main>
  );
}
