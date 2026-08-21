import Link from "next/link";
import RoyalGateBackground from "@/components/RoyalGateBackground";
import { AUSTRALIA_COUNTRY_PACK } from "@/lib/rooms/countries/australia";

export const metadata = {
  title: "Royal Command AI Australia",
  description: "Royal Command AI Australia country entry",
};

export default function AustraliaHomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b]">
      <RoyalGateBackground />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/5 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-5 py-7 text-center">
        <div className="pt-2">
          <div
            className="text-2xl tracking-[0.14em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] md:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            ROYAL COMMAND<span className="text-[var(--gold)]"> AI</span>
          </div>
          <div className="mt-2 text-sm font-semibold tracking-[0.28em] text-[#f1d889]">AUSTRALIA</div>
        </div>

        <div className="w-full max-w-4xl rounded-3xl border-2 border-[#d7b64d] bg-black/75 px-6 py-8 shadow-[0_0_55px_rgba(215,182,77,0.28)] backdrop-blur-md md:px-10 md:py-10">
          <p className="text-sm font-semibold tracking-[0.24em] text-[#f1d889]">AUSTRALIA COUNTRY SITE</p>
          <h1
            className="mt-3 text-4xl font-bold tracking-[0.06em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] md:text-6xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            YOUR COMMAND ROOM
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
            Global Core with Australia settings for AI Rooms, tools, memory, documents, permissions and approval workflows.
          </p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2 text-xs text-white/70">
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1">{AUSTRALIA_COUNTRY_PACK.languageTag}</span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1">{AUSTRALIA_COUNTRY_PACK.currencyCode}</span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1">{AUSTRALIA_COUNTRY_PACK.timeZone}</span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1">UTF-8 Safe Copy</span>
          </div>
        </div>

        <div className="mb-8 w-full max-w-2xl rounded-2xl border border-[#c9a84f]/45 bg-black/50 p-5 shadow-2xl backdrop-blur-sm md:p-7">
          <p className="mb-5 text-sm tracking-[0.14em] text-[#f1d889]">Existing authorised members</p>
          <Link
            href="/login?country=AU"
            className="block rounded-xl border border-[#d7b64d]/75 bg-[#0b0d12]/90 px-5 py-4 text-white transition hover:border-[#f3d36b] hover:bg-[#151923]"
          >
            <span className="block text-lg font-semibold">Enter Royal Command Australia</span>
            <span className="mt-1 block text-sm text-white/70">Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
