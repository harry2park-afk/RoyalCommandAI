"use client";

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PasskeyItem = {
  id: string;
  friendly_name?: string | null;
  created_at?: string;
  last_used_at?: string | null;
};

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export default function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const configured = supabaseConfigured();

  useEffect(() => {
    const PKC = window.PublicKeyCredential;
    if (!PKC?.isUserVerifyingPlatformAuthenticatorAvailable) {
      setSupported(false);
      return;
    }
    PKC.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setSupported)
      .catch(() => setSupported(false));
  }, []);

  async function refresh() {
    if (!configured) return;
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setMessage("Sign in with a Supabase-backed Royal Command account before registering a Passkey.");
        setPasskeys([]);
        return;
      }
      const { data, error } = await supabase.auth.passkey.list();
      if (error) throw error;
      setPasskeys((data || []) as PasskeyItem[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Passkeys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [configured]);

  async function register() {
    if (!configured) {
      setMessage("Supabase production authentication is not configured yet.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setMessage("Sign in first, then register this device as a Royal Command Passkey.");
        return;
      }
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setMessage(`Passkey registered${data?.friendly_name ? `: ${data.friendly_name}` : "."}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passkey registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(passkeyId: string) {
    if (!configured) return;
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.passkey.delete({ passkeyId });
      if (error) throw error;
      setMessage("Passkey removed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove Passkey.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rc-card border-[var(--gold)]/25 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Royal Passkey</p>
          <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
            Face / fingerprint / device Passkey
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Register a device once. The device can then use its own face, fingerprint, PIN or hardware security key without Royal Command storing biometric data.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[var(--muted)]">
          {supported === null ? "Checking device…" : supported ? "Device verification available" : "Platform biometric not detected"}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={register} className="rc-btn rc-btn-primary" disabled={loading || !configured}>
          <Fingerprint size={17} /> Register this device
        </button>
        <button type="button" onClick={() => void refresh()} className="rc-btn rc-btn-ghost" disabled={loading || !configured}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {!configured ? (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Production Passkey controls stay disabled until Supabase authentication and the WebAuthn relying-party settings are configured for the final Royal Command domain.
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {passkeys.map((passkey) => (
          <div key={passkey.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <div className="flex items-center gap-3">
              <KeyRound size={17} className="text-[var(--gold-soft)]" />
              <div>
                <div className="text-sm">{passkey.friendly_name || "Royal Command Passkey"}</div>
                <div className="text-xs text-[var(--muted)]">
                  {passkey.created_at ? `Added ${new Date(passkey.created_at).toLocaleDateString()}` : "Registered"}
                  {passkey.last_used_at ? ` · Last used ${new Date(passkey.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => void remove(passkey.id)} className="rc-btn rc-btn-ghost !px-3" disabled={loading} title="Remove Passkey">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {configured && !loading && passkeys.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No Passkey registered on this account yet.</p>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--gold-soft)]">{message}</p> : null}
    </section>
  );
}
