import Link from "next/link";

export default function ContinuePasswordRecoveryPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rc-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
          Secure recovery
        </p>
        <h1
          className="mt-2 text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Continue password reset
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          For security, the email link does not change your account by itself. Continue only if you requested this password reset.
        </p>

        <form
          action="/api/auth/password-recovery/confirm"
          method="post"
          className="mt-6"
        >
          <button className="rc-btn rc-btn-primary min-h-12 w-full text-base">
            Continue securely
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--muted)]">
          Did not request this?{" "}
          <Link href="/login" className="text-[var(--gold-soft)]">
            Return to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
