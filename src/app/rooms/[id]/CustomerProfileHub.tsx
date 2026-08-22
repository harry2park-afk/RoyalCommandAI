"use client";

import { useRef, useState } from "react";
import { FileText, HeartPulse, Mic, ShieldCheck, UserRound, X } from "lucide-react";

const TABS = [
  { id: "health", label: "건강 기록", icon: HeartPulse },
  { id: "profile", label: "내 정보", icon: UserRound },
  { id: "safety", label: "안전 설정", icon: ShieldCheck },
  { id: "documents", label: "중요 문서", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function CustomerProfileHub() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("health");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [healthNote, setHealthNote] = useState("");
  const [listening, setListening] = useState(false);
  const [healthFiles, setHealthFiles] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const healthFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);

  function choosePhoto(file?: File) {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setPhotoUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return next;
    });
  }

  function startVoiceEntry() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert("이 브라우저에서는 음성 입력을 지원하지 않습니다. 타이핑 또는 파일 업로드를 사용해 주세요.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) setHealthNote((current) => `${current}${current ? "\n" : ""}${transcript}`);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 top-[86px] z-[360] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#d7bb68] bg-[#102030] shadow-[0_6px_24px_rgba(0,0,0,.38)]"
        aria-label="고객 프로필과 건강 기록 열기"
        title="내 프로필 · 건강 기록"
      >
        {photoUrl ? <img src={photoUrl} alt="고객 사진" className="h-full w-full object-cover" /> : <UserRound size={26} className="text-[#f3d98c]" />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[500] flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="고객 프로필 허브">
          <section className="h-full w-full max-w-[430px] overflow-y-auto border-l border-[#d7bb68]/60 bg-[#08131f] text-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#08131f]/95 px-4 py-3 backdrop-blur">
              <div>
                <div className="text-sm font-semibold text-[#f3d98c]">My Royal Command</div>
                <div className="text-xs text-white/55">개인 프로필 · 건강 · 안전 · 문서</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="닫기"><X size={18} /></button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[#d7bb68]/25 bg-white/[0.03] p-3">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d7bb68] bg-[#102030]" title="사진 변경">
                  {photoUrl ? <img src={photoUrl} alt="고객 사진" className="h-full w-full object-cover" /> : <UserRound size={30} className="text-[#f3d98c]" />}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => choosePhoto(e.target.files?.[0])} />
                <div className="min-w-0">
                  <div className="font-semibold">내 프로필</div>
                  <div className="mt-1 text-xs leading-5 text-white/60">사진을 눌러 고객 사진을 넣을 수 있습니다.</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {TABS.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs ${active ? "border-[#d7bb68] bg-[#d7bb68]/10 text-[#ffe8a5]" : "border-white/10 bg-white/[0.02] text-white/75"}`}>
                      <Icon size={15} /> {item.label}
                    </button>
                  );
                })}
              </div>

              {tab === "health" ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-3">
                    <div className="text-sm font-semibold text-red-200">건강 기록</div>
                    <div className="mt-1 text-xs leading-5 text-white/60">검진 결과, 약, 알레르기, 과거 병력, 의사 메모 등을 타이핑·음성·파일로 입력할 수 있습니다.</div>
                  </div>
                  <textarea value={healthNote} onChange={(e) => setHealthNote(e.target.value)} rows={8} placeholder="예: 2026-08-22 건강검진 결과..." className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-[#d7bb68]" />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={startVoiceEntry} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs hover:border-[#d7bb68]"><Mic size={15} /> {listening ? "듣는 중..." : "말로 기록"}</button>
                    <button type="button" onClick={() => healthFileRef.current?.click()} className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:border-[#d7bb68]">검진 파일 추가</button>
                  </div>
                  <input ref={healthFileRef} type="file" multiple className="hidden" onChange={(e) => setHealthFiles(Array.from(e.target.files || []).map((file) => file.name))} />
                  {healthFiles.length ? <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/65">{healthFiles.map((name) => <div key={name}>• {name}</div>)}</div> : null}
                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3 text-[11px] leading-5 text-amber-100/80">건강정보는 민감정보입니다. 이 화면은 입력 UI를 먼저 제공합니다. 서버 영구저장은 암호화·접근권한·고객동의가 연결된 전용 Health Vault가 준비된 뒤 활성화해야 합니다.</div>
                </div>
              ) : null}

              {tab === "profile" ? (
                <div className="mt-4 space-y-2 text-sm">
                  {["이름·선호 이름", "언어", "지역·시간대", "선호하는 설명 방식", "관심 분야", "자주 쓰는 Room", "접근성 설정"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">{label}</div>
                  ))}
                </div>
              ) : null}

              {tab === "safety" ? (
                <div className="mt-4 space-y-2 text-sm">
                  {["긴급상황 감지 동의", "보호자·비상연락처", "위치 사용 동의", "카메라·마이크 안전감지 동의", "자동 화면 잠금", "낯선 사용자 감지", "동물 위험 대응"].map((label) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"><span>{label}</span><span className="text-xs text-white/45">설정</span></div>
                  ))}
                </div>
              ) : null}

              {tab === "documents" ? (
                <div className="mt-4 space-y-3">
                  <button type="button" onClick={() => documentFileRef.current?.click()} className="w-full rounded-xl border border-dashed border-[#d7bb68]/60 px-3 py-6 text-sm text-[#f3d98c]">중요 문서 추가</button>
                  <input ref={documentFileRef} type="file" multiple className="hidden" onChange={(e) => setDocumentFiles(Array.from(e.target.files || []).map((file) => file.name))} />
                  {documentFiles.length ? <div className="rounded-xl border border-white/10 p-3 text-xs text-white/65">{documentFiles.map((name) => <div key={name}>• {name}</div>)}</div> : <div className="text-xs text-white/45">보험, 신분증, 계약, 의료문서 등 필요한 개인 문서를 여기에 모으는 구조입니다.</div>}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
