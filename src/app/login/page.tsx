"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { usePreferences } from "@/lib/ui/preferences";
import { PreferencesPill } from "@/components/PreferencesPill";

const copy = {
  es: {
    title: "Acceso",
    subtitle: "Entra con OTP para operar tus eventos.",
    email: "Email",
    sendOtp: "Enviar OTP",
    sendingOtp: "Enviando...",
    otpSent: "OTP enviado. Revisa tu email.",
    error: "Error de autenticacion.",
    menuLabel: "Preferencias",
    language: "Idioma",
    theme: "Tema",
    spanish: "ES",
    english: "EN",
    light: "Claro",
    dark: "Oscuro",
  },
  en: {
    title: "Access",
    subtitle: "Sign in with OTP to run your events.",
    email: "Email",
    sendOtp: "Send OTP",
    sendingOtp: "Sending...",
    otpSent: "OTP sent. Check your email.",
    error: "Authentication error.",
    menuLabel: "Preferences",
    language: "Language",
    theme: "Theme",
    spanish: "ES",
    english: "EN",
    light: "Light",
    dark: "Dark",
  },
};

export default function LoginPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { locale, setLocale, theme, setTheme } = usePreferences();
  const t = copy[locale];

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      router.replace("/events");
    }
  }, [router, supabase]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setMessage(t.error);
    } else {
      setMessage(t.otpSent);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-10 px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent-contrast)]">
            AccessOS
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <PreferencesPill
          locale={locale}
          theme={theme}
          onLocaleChange={setLocale}
          onThemeChange={setTheme}
          labels={t}
        />
      </div>
      <form
        onSubmit={handleLogin}
        className="max-w-md rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6"
      >
        <label className="text-[10px] font-semibold uppercase tracking-[0.3em]">
          {t.email}
        </label>
        <input
          className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="team@accessos.com"
        />
        <button
          className="mt-4 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"
          type="submit"
          disabled={busy}
        >
          {busy ? t.sendingOtp : t.sendOtp}
        </button>
        {message ? <p className="mt-3 text-sm text-[var(--alert)]">{message}</p> : null}
      </form>
    </main>
  );
}
