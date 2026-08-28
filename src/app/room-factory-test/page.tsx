"use client";

import { useMemo, useState } from "react";
import { compileRoomFactoryBlueprint, roomFactoryCountryCoverage, type RoomFactoryApprovalMode } from "@/lib/rooms/factory";
import { GLOBAL_ROOM_PRESETS } from "@/lib/rooms/global";
import { ROOM_TEMPLATES } from "@/lib/rooms/templates";

export default function RoomFactoryTestPage() {
  const [roomName, setRoomName] = useState("Harry Global Test Room");
  const [templateId, setTemplateId] = useState("business");
  const [countryCode, setCountryCode] = useState("AU");
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [timeZone, setTimeZone] = useState("Australia/Sydney");
  const [currencyCode, setCurrencyCode] = useState("AUD");
  const [approvalMode, setApprovalMode] = useState<RoomFactoryApprovalMode>("approval");
  const [websiteKit, setWebsiteKit] = useState(false);
  const coverage = roomFactoryCountryCoverage();

  const blueprint = useMemo(() => compileRoomFactoryBlueprint({
    roomName,
    templateId,
    countryCode,
    languageTag,
    timeZone,
    currencyCode,
    approvalMode,
    websiteKit,
  }), [roomName, templateId, countryCode, languageTag, timeZone, currencyCode, approvalMode, websiteKit]);

  function applyCountry(code: string) {
    setCountryCode(code);
    const preset = GLOBAL_ROOM_PRESETS.find((item) => item.id === code);
    if (!preset) return;
    setTimeZone(preset.timeZone);
    setCurrencyCode(preset.currencyCode);
    setLanguageTag(preset.languageTag);
  }

  return (
    <main className="min-h-screen bg-[#07101d] px-4 py-8 text-[#f4f0e7] md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-[#d7b64d]/35 bg-black/25 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d889]">Royal Command · Room Factory Control Plane V1</p>
          <h1 className="mt-2 text-3xl font-semibold">Global Room Factory Test</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/70">This screen does not create or deploy a customer Room. It compiles the existing RCA Room template and country settings into the host-owned blueprint that will control safe Room production.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge ok>One Global Core</Badge>
            <Badge ok>Country Overlay Model</Badge>
            <Badge ok>Single Writer</Badge>
            <Badge ok>Evidence Before Success</Badge>
            <Badge ok>Structure-only Clone</Badge>
            <Badge ok>Production Write Off by Default</Badge>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-semibold text-[#f1d889]">1. Factory Input</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Room Name"><input className="rc-input mt-2" value={roomName} onChange={(event) => setRoomName(event.target.value)} /></Field>
              <Field label="Room Template">
                <select className="rc-input mt-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                  {ROOM_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </Field>
              <Field label="Country / Region">
                <select className="rc-input mt-2" value={GLOBAL_ROOM_PRESETS.some((item) => item.id === countryCode) ? countryCode : "CUSTOM"} onChange={(event) => {
                  if (event.target.value === "CUSTOM") setCountryCode("DE");
                  else applyCountry(event.target.value);
                }}>
                  {GLOBAL_ROOM_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  <option value="CUSTOM">Custom / Unregistered profile</option>
                </select>
              </Field>
              <Field label="Country Code"><input className="rc-input mt-2" value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase().slice(0, 8))} /></Field>
              <Field label="Room Language"><input className="rc-input mt-2" value={languageTag} onChange={(event) => setLanguageTag(event.target.value.slice(0, 35))} /></Field>
              <Field label="Time Zone"><input className="rc-input mt-2" value={timeZone} onChange={(event) => setTimeZone(event.target.value.slice(0, 80))} /></Field>
              <Field label="Currency"><input className="rc-input mt-2" value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))} /></Field>
              <Field label="Execution Mode">
                <select className="rc-input mt-2" value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as RoomFactoryApprovalMode)}>
                  <option value="safe">Safe</option>
                  <option value="approval">Run After Approval</option>
                  <option value="autonomous">Autonomous Within Approved Scope</option>
                </select>
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={websiteKit} onChange={(event) => setWebsiteKit(event.target.checked)} /> Include Website Builder Kit</label>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
              <div className="font-semibold text-[#f1d889]">Global scaling model</div>
              <p className="mt-2 leading-6 text-white/70">{coverage.strategy}</p>
              <p className="mt-2 text-xs text-white/55">Registered country presets now: {coverage.registeredProfiles}. Unregistered countries are not treated as compliant automatically; they enter custom-profile-required state.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#f1d889]">2. Host Blueprint</h2>
              <Badge ok={blueprint.readiness.readyForSafeBuild}>{blueprint.readiness.readyForSafeBuild ? "READY FOR SAFE BUILD" : "BLOCKED"}</Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Summary label="Template" value={blueprint.room.templateName} />
              <Summary label="Country Profile" value={blueprint.locale.countryProfileStatus} />
              <Summary label="Language" value={blueprint.locale.languageTag} />
              <Summary label="Currency" value={blueprint.locale.currencyCode} />
              <Summary label="Single Write Authority" value={blueprint.execution.singleWriteAuthority ? "Required" : "Off"} />
              <Summary label="Reviewer Write" value={blueprint.execution.reviewerCanWrite ? "Allowed" : "Blocked"} />
              <Summary label="Evidence Gate" value={blueprint.execution.evidenceBeforeSuccess ? "Required" : "Off"} />
              <Summary label="Production Write" value={blueprint.execution.productionWriteDefault ? "On" : "Off by default"} />
              <Summary label="Tenant Isolation" value={blueprint.execution.tenantIsolationRequired ? "Required" : "Off"} />
              <Summary label="Secrets" value={blueprint.execution.secretsStayHostOwned ? "Host-owned" : "Unrestricted"} />
              <Summary label="Clone Customer Data" value={blueprint.clonePolicy.customerData ? "Yes" : "No"} />
              <Summary label="Clone Credentials" value={blueprint.clonePolicy.credentials ? "Yes" : "No"} />
            </div>

            {blueprint.readiness.blockers.length ? <Notice title="Blockers" items={blueprint.readiness.blockers} danger /> : null}
            {blueprint.readiness.warnings.length ? <Notice title="Warnings" items={blueprint.readiness.warnings} /> : null}

            <h3 className="mt-6 font-semibold">Factory Work Lanes</h3>
            <div className="mt-3 space-y-2">
              {blueprint.lanes.map((lane, index) => (
                <div key={lane.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-3"><strong>{index + 1}. {lane.name}</strong><span className="text-[10px] uppercase tracking-wide text-emerald-300">Single Writer · Review · Evidence</span></div>
                  <p className="mt-1 text-xs leading-5 text-white/60">{lane.purpose}</p>
                </div>
              ))}
            </div>

            <details className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <summary className="cursor-pointer font-semibold text-[#f1d889]">Blueprint JSON Evidence</summary>
              <pre className="mt-3 max-h-[440px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/70">{JSON.stringify(blueprint, null, 2)}</pre>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}{children}</label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</div><div className="mt-1 break-words text-sm font-semibold">{value}</div></div>;
}

function Badge({ children, ok = false }: { children: React.ReactNode; ok?: boolean }) {
  return <span className={`rounded-full border px-3 py-1 ${ok ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : "border-amber-400/35 bg-amber-500/10 text-amber-100"}`}>{children}</span>;
}

function Notice({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return <div className={`mt-4 rounded-2xl border p-4 text-sm ${danger ? "border-red-400/35 bg-red-500/10" : "border-amber-400/35 bg-amber-500/10"}`}><strong>{title}</strong><ul className="mt-2 list-disc space-y-1 pl-5 text-white/75">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
