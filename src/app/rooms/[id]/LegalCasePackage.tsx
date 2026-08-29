"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Clipboard, FileDown, FileStack, X } from "lucide-react";

type WorkspacePayload = {
  enabled?: boolean;
  languageTag?: string;
  room?: { name?: string };
  workspace?: { caseStory?: string; desiredOutcome?: string };
  evidence?: Array<{ title?: string; event_date?: string | null; description?: string }>;
};

type StoryEntry = {
  id: string;
  raw_transcript: string;
  ai_summary: string;
  recorded_at: string;
};

type Audience = "lawyer" | "court" | "personal";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function audienceInstruction(audience: Audience, korean: boolean) {
  if (korean) {
    if (audience === "lawyer") return "변호사에게 처음 보내거나 상담 전에 전달할 사건 요약 자료";
    if (audience === "court") return "법원·재판·심판 절차를 준비할 때 사실관계를 검토하기 위한 정리 자료. 특정 법원 서식인 것처럼 표현하지 말고, 제출 전 해당 법원 규칙과 변호사 검토가 필요함을 표시";
    return "고객 본인이 전체 사건을 이해하고 보관하기 위한 종합 사건 기록";
  }
  if (audience === "lawyer") return "a concise case brief for a lawyer before the first consultation";
  if (audience === "court") return "a factual court/tribunal preparation brief; do not present it as an official court form and state that filing rules and legal review may be required";
  return "a complete personal master case record for the customer";
}

export default function LegalCasePackage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [enabled, setEnabled] = useState(false);
  const [languageTag, setLanguageTag] = useState("en-AU");
  const [roomName, setRoomName] = useState("Legal Room");
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspacePayload["workspace"]>({});
  const [evidence, setEvidence] = useState<NonNullable<WorkspacePayload["evidence"]>>([]);
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [audience, setAudience] = useState<Audience>("lawyer");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const korean = languageTag.toLowerCase().startsWith("ko");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/rooms/${roomId}/legal-workspace`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) as WorkspacePayload }))
      .then(({ response, payload }) => {
        if (cancelled || !response.ok || !payload.enabled) return;
        setEnabled(true);
        setLanguageTag(payload.languageTag || "en-AU");
        setRoomName(payload.room?.name || "Legal Room");
        setWorkspace(payload.workspace || {});
        setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      void Promise.all([
        fetch(`/api/rooms/${roomId}/legal-workspace`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
        fetch(`/api/rooms/${roomId}/legal-story`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      ]).then(([legal, story]) => {
        if (legal?.workspace) setWorkspace(legal.workspace);
        if (Array.isArray(legal?.evidence)) setEvidence(legal.evidence);
        if (Array.isArray(story?.entries)) setEntries(story.entries as StoryEntry[]);
      }).catch(() => undefined);
    };
    refresh();
    window.addEventListener("rc:legal-story-saved", refresh);
    return () => window.removeEventListener("rc:legal-story-saved", refresh);
  }, [enabled, roomId]);

  const sourceText = useMemo(() => {
    const datedEntries = [...entries]
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .map((entry, index) => [
        `# ${index + 1} · ${entry.recorded_at}`,
        `Customer transcript:\n${entry.raw_transcript}`,
        entry.ai_summary ? `AI response/summary:\n${entry.ai_summary}` : "",
      ].filter(Boolean).join("\n"))
      .join("\n\n");

    const evidenceText = evidence.map((item, index) =>
      `${index + 1}. ${item.event_date || "date not set"} · ${item.title || "Evidence"}${item.description ? ` · ${item.description}` : ""}`,
    ).join("\n");

    return [
      `ROOM: ${roomName}`,
      `DESIRED OUTCOME:\n${workspace?.desiredOutcome || "Not recorded"}`,
      `MASTER CASE STORY:\n${workspace?.caseStory || "Not recorded"}`,
      `DATED STORY SESSIONS:\n${datedEntries || "No dated sessions yet"}`,
      `EVIDENCE INDEX:\n${evidenceText || "No evidence index yet"}`,
    ].join("\n\n");
  }, [entries, evidence, roomName, workspace]);

  async function generatePackage() {
    setLoading(true);
    setStatus("");
    setResult("");
    const target = audienceInstruction(audience, korean);
    const instruction = korean
      ? [
          `다음 전체 사건 자료를 바탕으로 ${target}를 작성해 주세요.`,
          "고객이 여러 날에 걸쳐 말한 모든 기록을 하나의 사건으로 통합하세요.",
          "사실을 임의로 추가하지 마세요. 서로 충돌하는 진술이나 불확실한 부분은 별도로 표시하세요.",
          "다음 순서로 작성하세요:",
          "1. 문서 제목",
          "2. 한눈에 보는 사건 요약",
          "3. 당사자/관계인",
          "4. 날짜순 사건 경과",
          "5. 핵심 쟁점과 확인이 필요한 부분",
          "6. 증거 목록 및 각 증거가 뒷받침하는 사실",
          "7. 고객이 원하는 결과",
          "8. 상대방 또는 변호사/법원에 확인할 질문",
          "9. 빠진 자료 체크리스트",
          audience === "court" ? "10. 주의: 이것은 법원 공식 서식이 아니라 준비용 초안이며 제출 전 관할 법원 규칙과 법률 검토가 필요하다고 마지막에 표시하세요." : "",
          "원문에서 확인할 수 없는 법률 결론은 단정하지 마세요.",
          "",
          sourceText.slice(0, 90000),
        ].filter(Boolean).join("\n")
      : [
          `Using the complete case material below, prepare ${target}.`,
          "Combine all dated customer sessions as one continuing matter.",
          "Do not invent facts. Identify contradictions and uncertainty explicitly.",
          "Use this structure: title; executive case summary; people/parties; chronology; key issues and gaps; evidence index with what each item supports; desired outcome; questions for recipient; missing-material checklist.",
          audience === "court" ? "End with a clear note that this is a preparation draft, not an official court form, and filing rules/legal review may be required." : "",
          "Do not state legal conclusions that are not supported by the supplied facts.",
          "",
          sourceText.slice(0, 90000),
        ].filter(Boolean).join("\n");

    try {
      const response = await fetch("/api/ai/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          message: instruction,
          selectedLanguage: korean ? "ko" : "en",
          history: [],
        }),
      });
      const payload = await response.json().catch(() => ({})) as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) {
        setStatus(payload.error || (korean ? "전체 사건 정리를 만들지 못했습니다." : "Could not create the case package."));
        return;
      }
      setResult(String(payload.answer));
      setStatus(korean ? "전체 사건 정리가 만들어졌습니다. 내용을 확인한 뒤 복사하거나 PDF로 저장하세요." : "Case package created. Review it before copying or saving as PDF.");
    } catch {
      setStatus(korean ? "전체 사건 정리를 만들지 못했습니다." : "Could not create the case package.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setStatus(korean ? "전체 문서를 복사했습니다." : "Document copied.");
    } catch {
      setStatus(korean ? "복사하지 못했습니다. 내용을 직접 선택해 주세요." : "Could not copy. Select the text manually.");
    }
  }

  function savePdf() {
    if (!result) return;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      setStatus(korean ? "새 창을 열 수 없습니다. 브라우저의 팝업 허용을 확인해 주세요." : "Could not open the PDF window. Check popup permissions.");
      return;
    }
    const title = audience === "lawyer"
      ? (korean ? "변호사 전달용 사건 정리" : "Lawyer Case Brief")
      : audience === "court"
        ? (korean ? "법원·재판 준비용 사건 정리" : "Court / Tribunal Preparation Brief")
        : (korean ? "전체 사건 기록" : "Master Case Record");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,'Noto Sans KR',sans-serif;max-width:820px;margin:36px auto;padding:0 24px;line-height:1.6;color:#111}h1{font-size:24px}pre{white-space:pre-wrap;font:inherit} .meta{color:#555;font-size:12px;margin-bottom:24px}@media print{body{margin:0;max-width:none}.no-print{display:none}}</style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(roomName)} · ${escapeHtml(new Date().toLocaleString())}</div><pre>${escapeHtml(result)}</pre><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
    popup.document.close();
  }

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-[390px] top-[104px] z-[241] rounded-full border border-[#d7b64d] bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#ffe18a] shadow-lg max-lg:left-[150px] max-lg:top-20"
      >
        <span className="inline-flex items-center gap-2"><FileStack size={16} />{korean ? "전체 사건 정리" : "Case package"}</span>
      </button>

      {open ? (
        <section className="fixed left-[245px] right-[185px] top-[104px] bottom-[28px] z-[420] overflow-y-auto rounded-2xl border border-[#d7b64d]/70 bg-[#07111f]/[0.99] p-5 shadow-[0_18px_60px_rgba(0,0,0,.7)] max-lg:left-3 max-lg:right-3 max-lg:top-20 max-lg:bottom-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#f3d36a]">{korean ? "전체 사건 정리" : "Complete Case Package"}</h2>
              <p className="mt-1 text-sm text-white/65">{korean ? `저장된 사건 이야기 ${entries.length}건과 증거 ${evidence.length}건을 한 번에 통합합니다.` : `Combines ${entries.length} saved story sessions and ${evidence.length} evidence items.`}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10"><X size={18} /></button>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] text-sm text-white/75">
              <span className="mb-1 block font-semibold text-[#f3d36a]">{korean ? "누구에게 보낼 자료인가요?" : "Who is this for?"}</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="rc-input h-11 w-full">
                <option value="lawyer">{korean ? "변호사" : "Lawyer"}</option>
                <option value="court">{korean ? "법원·재판 준비" : "Court / tribunal preparation"}</option>
                <option value="personal">{korean ? "내 전체 보관용" : "My master record"}</option>
              </select>
            </label>
            <button type="button" disabled={loading || !workspace?.caseStory} onClick={() => void generatePackage()} className="h-11 rounded-lg border border-[#d7b64d] bg-[#7A0C2E] px-5 text-sm font-semibold text-[#ffe18a] disabled:opacity-40">
              {loading ? (korean ? "정리 중…" : "Preparing…") : (korean ? "전체 기록 통합하기" : "Create complete package")}
            </button>
          </div>

          {status ? <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">{status}</div> : null}

          {result ? (
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyResult()} className="inline-flex items-center gap-2 rounded-lg border border-[#d7b64d] px-4 py-2 text-sm font-semibold text-[#ffe18a]"><Clipboard size={16} />{korean ? "전체 복사" : "Copy all"}</button>
                <button type="button" onClick={savePdf} className="inline-flex items-center gap-2 rounded-lg border border-[#d7b64d] px-4 py-2 text-sm font-semibold text-[#ffe18a]"><FileDown size={16} />{korean ? "PDF 저장" : "Save PDF"}</button>
              </div>
              <div className="max-h-[calc(100dvh-330px)] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#d7b64d]/35 bg-black/25 p-5 text-[16px] leading-7 text-white/90">{result}</div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/65">
              {korean ? "사건 이야기를 며칠 또는 몇 달 동안 계속 추가해도 됩니다. 충분히 기록한 뒤 여기에서 한 번에 통합하면 됩니다. AI가 만든 문서는 반드시 사실관계를 확인한 뒤 사용하세요." : "Keep adding story sessions for days or months. When the record is mature, combine it here. Always verify the facts in an AI-generated document before using it."}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
