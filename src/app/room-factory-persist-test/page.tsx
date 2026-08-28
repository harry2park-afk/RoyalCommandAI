"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { compileRoomFactoryBlueprint, type RoomFactoryApprovalMode } from "@/lib/rooms/factory";
import { GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";

type CreatedResult = {
  room?: { id: string; name: string };
  manifest?: { id: string; room_id: string; factory_version: string; template_id: string; country_code: string; language_tag: string; country_profile_status: string };
  error?: unknown;
};

export default function RoomFactoryPersistTestPage() {
  const [roomName, setRoomName] = useState("Harry Factory Manifest Test");
  const [templateId, setTemplateId] = useState("business");
  const [countryCode, setCountryCode] = useState("AU");
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [timeZone, setTimeZone] = useState("Australia/Sydney");
  const [currencyCode, setCurrencyCode] = useState("AUD");
  const [approvalMode, setApprovalMode] = useState<RoomFactoryApprovalMode>("approval");
  const [websiteKit, setWebsiteKit] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<CreatedResult | null>(null);

  const input = useMemo(() => ({
    roomName,
    templateId,
    countryCode,
    languageTag,
    timeZone,
    currencyCode,
    approvalMode,
    websiteKit,
    selectedMaterials: [] as string[],
  }), [roomName, templateId, countryCode, languageTag, timeZone, currencyCode, approvalMode, websiteKit]);

  const blueprint = useMemo(() => compileRoomFactoryBlueprint(input), [input]);

  function applyCountry(code: string) {
    setCountryCode(code);
    const preset = GLOBAL_ROOM_PRESETS.find((item) => item.id === code);
    if (!preset) return;
    setLanguageTag(preset.languageTag);
    setTimeZone(preset.timeZone);
    setCurrencyCode(preset.currencyCode);
  }

  async function createTestRoom() {
    if (working || !blueprint.readiness.readyForSafeBuild) return;
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/room-factory/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({ error: "Invalid server response" }));
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Request failed" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07101d] px-4 py-8 text-[#f4f0e7] md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-[#d7b64d]/35 bg-black/25 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d889]">Royal Command · Room Factory Manifest Test</p>
          <h1 className="mt-2 text-3xl font-semibold">Create a Safe Test Room</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">This creates a real authenticated test Room and a separate host-compiled Factory Manifest. Production code is not changed by this screen; it tests Room creation data only.</p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="font-semibold text-[#f1d889]">Factory Input</h2>
            <div className="mt-4 space-y-4">
              <Field label="Room Name"><input className="rc-input mt-2" value={roomName} onChange={(e) => setRoomName(e.target.value.slice(0, 120))} /></Field>
              <Field label="Template"><select className="rc-input mt-2" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{ROOM_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Country"><select className="rc-input mt-2" value={GLOBAL_ROOM_PRESETS.some((item) => item.id === countryCode) ? countryCode : "CUSTOM"} onChange={(e) => e.target.value === "CUSTOM" ? setCountryCode("DE") : applyCountry(e.target.value)}>{GLOBAL_ROOM_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="CUSTOM">Custom / Unregistered</option></select></Field>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Country Code"><input className="rc-input mt-2" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 8))} /></Field><Field label="Language"><input className="rc-input mt-2" value={languageTag} onChange={(e) => setLanguageTag(e.target.value.slice(0, 35))} /></Field></div>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Time Zone"><input className="rc-input mt-2" value={timeZone} onChange={(e) => setTimeZone(e.target.value.slice(0, 80))} /></Field><Field label="Currency"><input className="rc-input mt-2" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 3))} /></Field></div>
              <Field label="Execution Mode"><select className="rc-input mt-2" value={approvalMode} onChange={(e) => setApprovalMode(e.target.value as RoomFactoryApprovalMode)}><option value="safe">Safe</option><option value="approval">Run After Approval</option><option value="autonomous">Autonomous Within Approved Scope</option></select></Field>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={websiteKit} onChange={(e) => setWebsiteKit(e.target.checked)} /> Include Website Builder Kit</label>
            </div>

            <button type="button" onClick={createTestRoom} disabled={working || !blueprint.readiness.readyForSafeBuild} className="mt-5 min-h-12 w-full rounded-xl bg-[#d7b64d] px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">
              {working ? "Creating & Verifying..." : "Create Safe Test Room"}
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-[#f1d889]">Host Safety Preview</h2><span className={`rounded-full border px-3 py-1 text-xs ${blueprint.readiness.readyForSafeBuild ? "border-emerald-400/40 text-emerald-200" : "border-red-400/40 text-red-200"}`}>{blueprint.readiness.readyForSafeBuild ? "READY" : "BLOCKED"}</span></div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <Summary label="Template" value={blueprint.room.templateName} />
              <Summary label="Country Profile" value={blueprint.locale.countryProfileStatus} />
              <Summary label="Single Writer" value="Required" />
              <Summary label="Reviewer Write" value="Blocked" />
              <Summary label="Evidence Gate" value="Required" />
              <Summary label="Production Write" value="Off by default" />
              <Summary label="Tenant Isolation" value="Required" />
              <Summary label="Clone Customer Data" value="No" />
            </div>

            {result ? (
              <div className={`mt-5 rounded-2xl border p-4 ${result.room && result.manifest ? "border-emerald-400/35 bg-emerald-500/10" : "border-red-400/35 bg-red-500/10"}`}>
                {result.room && result.manifest ? (
                  <>
                    <div className="font-semibold text-emerald-200">HOST-VERIFIED MANIFEST SAVED</div>
                    <div className="mt-3 space-y-2 text-sm"><Row label="Room ID" value={result.room.id} /><Row label="Manifest ID" value={result.manifest.id} /><Row label="Factory Version" value={result.manifest.factory_version} /><Row label="Template" value={result.manifest.template_id} /><Row label="Country" value={result.manifest.country_code} /><Row label="Language" value={result.manifest.language_tag} /></div>
                    <Link href={`/rooms/${result.room.id}`} className="mt-4 inline-block rounded-xl border border-[#d7b64d]/60 px-4 py-2 text-sm font-semibold text-[#f1d889]">Open Created Room</Link>
                  </>
                ) : (
                  <><div className="font-semibold text-red-200">CREATE FAILED</div><pre className="mt-2 whitespace-pre-wrap break-words text-xs text-white/70">{JSON.stringify(result.error ?? result, null, 2)}</pre></>
                )}
              </div>
            ) : <p className="mt-5 text-sm leading-6 text-white/55">After creation, both a Room ID and a Manifest ID must appear. A Room without Manifest evidence is not considered a successful Factory creation.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}{children}</label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] uppercase tracking-wide text-white/45">{label}</div><div className="mt-1 break-words font-semibold">{value}</div></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div><span className="text-white/45">{label}: </span><span className="break-all font-medium">{value}</span></div>; }
