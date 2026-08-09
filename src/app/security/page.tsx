import Link from "next/link";
import StepUpPanel from "@/components/security/StepUpPanel";
import PasskeyManager from "@/components/security/PasskeyManager";
import {
  BIOMETRIC_POLICY,
  SECURITY_CONTROLS,
  SECURITY_POLICY_VERSION,
  SECURITY_UPDATE_POLICY,
  SECURITY_UX_POLICY,
} from "@/lib/security/royal-security";
import { getPasskeyReadiness, PASSKEY_STORAGE_POLICY } from "@/lib/security/passkey-store";

export default function SecurityPage() {
  const passkey = getPasskeyReadiness();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">← Dashboard</Link>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">Royal Command Security</p>
          <h1 className="mt-1 text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>Security & Trust Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Strong security with minimal customer interruption. Controls are centrally versioned so Royal Command can strengthen protection without redesigning every Room.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-3 text-right">
          <div className="text-xs text-[var(--muted)]">Policy version</div>
          <div className="text-lg font-semibold text-[var(--gold-soft)]">{SECURITY_POLICY_VERSION.version}</div>
          <div className="text-xs text-[var(--muted)]">Review every {SECURITY_POLICY_VERSION.reviewCadenceDays} days</div>
        </div>
      </header>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rc-card p-5">
          <div className="text-sm font-medium text-[var(--gold-soft)]">Customer experience</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{SECURITY_UX_POLICY.principle}</p>
          <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
            <div>Preferred sign-in: {SECURITY_UX_POLICY.defaultAuthentication}</div>
            <div>Trusted devices: {SECURITY_UX_POLICY.rememberTrustedDevice ? "Enabled" : "Disabled"}</div>
            <div>Silent risk checks: {SECURITY_UX_POLICY.silentRiskChecks ? "Enabled" : "Disabled"}</div>
            <div>Step-up only for sensitive actions: {SECURITY_UX_POLICY.stepUpOnlyForSensitiveActions ? "Yes" : "No"}</div>
          </div>
        </div>

        <div className="rc-card p-5">
          <div className="text-sm font-medium text-[var(--gold-soft)]">Biometric privacy</div>
          <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
            <div>Default: {BIOMETRIC_POLICY.defaultMode}</div>
            <div>Store face images: {BIOMETRIC_POLICY.storeFaceImages ? "Yes" : "No"}</div>
            <div>Store biometric templates: {BIOMETRIC_POLICY.storeBiometricTemplates ? "Yes" : "No"}</div>
            <div>Continuous camera monitoring: {BIOMETRIC_POLICY.continuousCameraMonitoring ? "Yes" : "No"}</div>
            <div>Fallback available: {BIOMETRIC_POLICY.allowFallback ? "Yes" : "No"}</div>
          </div>
        </div>

        <div className="rc-card p-5">
          <div className="text-sm font-medium text-[var(--gold-soft)]">Update architecture</div>
          <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
            <div>Central policy updates: {SECURITY_UPDATE_POLICY.centralPolicyDriven ? "Yes" : "No"}</div>
            <div>Emergency kill switch: {SECURITY_UPDATE_POLICY.emergencyKillSwitch ? "Yes" : "No"}</div>
            <div>Staged rollout: {SECURITY_UPDATE_POLICY.stagedRollout ? "Yes" : "No"}</div>
            <div>Rollback: {SECURITY_UPDATE_POLICY.rollbackSupported ? "Yes" : "No"}</div>
            <div>Audit every policy change: {SECURITY_UPDATE_POLICY.auditEveryPolicyChange ? "Yes" : "No"}</div>
          </div>
        </div>
      </section>

      <div className="mb-6">
        <PasskeyManager />
      </div>

      <section className="rc-card mb-6 border-[var(--gold)]/25 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Passkey activation</p>
            <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Credential storage is prepared safely</h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
              Royal Command stores only verified public WebAuthn credential material. Face, fingerprint, device PIN and private keys are never stored by Royal Command.
            </p>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs ${passkey.productionReady ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
            {passkey.productionReady ? "Production ready" : "Safe activation pending"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-xs text-[var(--muted)]">
            <div className="font-medium text-[var(--text)]">Storage policy</div>
            <div className="mt-3 space-y-2">
              <div>Biometric data stored: {PASSKEY_STORAGE_POLICY.storesBiometricData ? "Yes" : "No"}</div>
              <div>Private keys stored: {PASSKEY_STORAGE_POLICY.storesPrivateKeys ? "Yes" : "No"}</div>
              <div>Browser direct writes: {PASSKEY_STORAGE_POLICY.browserDirectWritesAllowed ? "Yes" : "No"}</div>
              <div>Server verification required: {PASSKEY_STORAGE_POLICY.serverVerificationRequired ? "Yes" : "No"}</div>
              <div>Recommended registered credentials: {PASSKEY_STORAGE_POLICY.minimumCredentialsRecommended}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-xs text-[var(--muted)]">
            <div className="font-medium text-[var(--text)]">Before live activation</div>
            <div className="mt-3 space-y-2">
              {passkey.blockers.map((item) => <div key={item}>• {item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6">
        <StepUpPanel />
      </div>

      <section className="rc-card p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Security controls</p>
            <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Current Royal Command baseline</h2>
          </div>
          <p className="text-xs text-[var(--muted)]">Minimum security cannot be reduced by individual Rooms.</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SECURITY_CONTROLS.map((control) => (
            <article key={control.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{control.title}</div>
                <div className="flex gap-2 text-[11px]">
                  <span className="rounded-full border border-[var(--gold)]/30 px-2 py-1 text-[var(--gold-soft)]">{control.priority}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[var(--muted)]">{control.userFriction}</span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{control.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
