"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

type CustomerInfo = { id: string; fullName: string; defaultLanguage: string; countryCode: string };
type LocaleKey = "en" | "ko" | "ja" | "zh" | "vi" | "id" | "th" | "hi";
type Stage = "idle" | "listening" | "thinking" | "speaking" | "fallback";
type Copy = {
  headline: string; greeting: string; start: string; listening: string; speaking: string; thinking: string; paused: string;
  placeholder: string; sound: string; micFail: string; voiceFail: string; preparing: string; ready: string;
  starters: [string, string, string]; fallback: (input: string) => string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: { headline: "Speak. We move for you.", greeting: "Welcome. I’m Royal Command AI. You are in command here. No need to learn anything—just speak. I’m listening.", start: "Start AI", listening: "Listening", speaking: "Speaking", thinking: "Understanding", paused: "Ready when you are", placeholder: "Or tell me here…", sound: "Hear AI", micFail: "The microphone isn’t ready. That’s fine—tell me below in writing.", voiceFail: "I couldn’t speak aloud, but I’m still here. We can continue in text.", preparing: "I’m preparing your basic Room while we talk…", ready: "Your Room is ready. I’ll continue with you there.", starters: ["What can you do for me?", "Recommend what I need", "Just help me get started"], fallback: (input) => `I heard you: “${input}”. I’ve prepared a basic Room so we can start with the most useful next step and improve it as we go.` },
  ko: { headline: "말씀하세요. 당신을 위해 움직입니다.", greeting: "환영합니다. 저는 Royal Command AI입니다. 이곳에서는 고객님이 주인입니다. 배우실 필요 없습니다. 편하게 말씀해 주세요. 제가 듣겠습니다.", start: "AI 시작하기", listening: "듣고 있어요", speaking: "말씀드리는 중", thinking: "이해하고 있어요", paused: "편하게 말씀해 주세요", placeholder: "또는 여기에 말씀해 주세요…", sound: "AI 소리 듣기", micFail: "마이크가 아직 준비되지 않았네요. 괜찮습니다. 아래에 글로 말씀해 주세요.", voiceFail: "소리가 나오지 않아도 괜찮습니다. 글로 그대로 이어서 도와드릴게요.", preparing: "말씀하시는 동안 기본 Room을 준비하고 있습니다…", ready: "Room을 준비했습니다. 그 안에서도 같은 대화를 계속하겠습니다.", starters: ["무엇을 할 수 있나요?", "제가 필요한 걸 추천해 주세요", "그냥 시작해 주세요"], fallback: (input) => `“${input}”라고 말씀하셨군요. 바로 시작할 수 있는 기본 Room을 준비했습니다. 가장 필요한 일부터 하나씩 같이 해결하겠습니다.` },
  ja: { headline: "話してください。あなたのために動きます。", greeting: "ようこそ。Royal Command AIです。ここではあなたが主役です。難しいことを覚える必要はありません。気軽に話してください。聞いています。", start: "AIを始める", listening: "聞いています", speaking: "話しています", thinking: "理解しています", paused: "いつでも話してください", placeholder: "または、ここに入力してください…", sound: "AIの音声を聞く", micFail: "マイクがまだ使えません。大丈夫です。下に文字で入力してください。", voiceFail: "音声が出なくても大丈夫です。文字でそのまま続けられます。", preparing: "お話を聞きながら基本のRoomを準備しています…", ready: "Roomの準備ができました。このまま会話を続けます。", starters: ["何ができますか？", "必要なものを提案して", "まず始めてください"], fallback: (input) => `「${input}」とお聞きしました。すぐ始められる基本のRoomを準備しました。` },
  zh: { headline: "请说。我们为你行动。", greeting: "欢迎。我是 Royal Command AI。在这里你做主。不需要学习复杂操作，直接告诉我就好。我在听。", start: "启动 AI", listening: "正在倾听", speaking: "正在说话", thinking: "正在理解", paused: "随时告诉我", placeholder: "也可以在这里输入…", sound: "听听 AI", micFail: "麦克风还没准备好。没关系，请在下面输入告诉我。", voiceFail: "即使没有声音也没关系，我们可以继续用文字交流。", preparing: "我正在一边听你说，一边准备基础 Room…", ready: "Room 已准备好。进去后我们会继续同一段对话。", starters: ["你能为我做什么？", "请推荐我需要的功能", "先帮我开始吧"], fallback: (input) => `我听到你说：“${input}”。我已经准备好一个基础 Room。` },
  vi: { headline: "Hãy nói. Chúng tôi hành động vì bạn.", greeting: "Chào mừng. Tôi là Royal Command AI. Ở đây bạn là người quyết định. Không cần học cách dùng máy tính—hãy cứ nói. Tôi đang lắng nghe.", start: "Bắt đầu AI", listening: "Đang lắng nghe", speaking: "Đang nói", thinking: "Đang hiểu", paused: "Hãy nói khi bạn sẵn sàng", placeholder: "Hoặc viết cho tôi ở đây…", sound: "Nghe AI", micFail: "Mic chưa sẵn sàng. Không sao, hãy viết cho tôi ở bên dưới.", voiceFail: "Nếu chưa nghe được âm thanh cũng không sao. Ta có thể tiếp tục bằng chữ.", preparing: "Tôi đang chuẩn bị Room cơ bản trong khi lắng nghe bạn…", ready: "Room của bạn đã sẵn sàng. Tôi sẽ tiếp tục cùng bạn ở đó.", starters: ["Bạn có thể làm gì cho tôi?", "Hãy đề xuất điều tôi cần", "Hãy giúp tôi bắt đầu"], fallback: (input) => `Tôi đã nghe bạn nói: “${input}”. Tôi đã chuẩn bị một Room cơ bản.` },
  id: { headline: "Bicaralah. Kami bergerak untuk Anda.", greeting: "Selamat datang. Saya Royal Command AI. Di sini Anda yang memegang kendali. Tidak perlu belajar hal rumit—cukup bicara. Saya mendengarkan.", start: "Mulai AI", listening: "Mendengarkan", speaking: "Berbicara", thinking: "Memahami", paused: "Silakan bicara kapan saja", placeholder: "Atau tulis di sini…", sound: "Dengar AI", micFail: "Mikrofon belum siap. Tidak apa-apa, tulis saja di bawah.", voiceFail: "Jika suara belum terdengar, tidak apa-apa. Kita bisa lanjut lewat teks.", preparing: "Saya menyiapkan Room dasar sambil mendengarkan Anda…", ready: "Room Anda sudah siap. Saya akan melanjutkan percakapan di sana.", starters: ["Apa yang bisa Anda lakukan?", "Sarankan yang saya perlukan", "Bantu saya mulai"], fallback: (input) => `Saya mendengar Anda: “${input}”. Room dasar sudah saya siapkan.` },
  th: { headline: "พูดได้เลย เราจะลงมือเพื่อคุณ", greeting: "ยินดีต้อนรับ ฉันคือ Royal Command AI ที่นี่คุณเป็นผู้ตัดสินใจ ไม่ต้องเรียนรู้ขั้นตอนยุ่งยาก แค่พูดได้เลย ฉันกำลังฟังอยู่", start: "เริ่ม AI", listening: "กำลังฟัง", speaking: "กำลังพูด", thinking: "กำลังทำความเข้าใจ", paused: "พูดได้เมื่อพร้อม", placeholder: "หรือพิมพ์บอกฉันที่นี่…", sound: "ฟังเสียง AI", micFail: "ไมโครโฟนยังไม่พร้อม ไม่เป็นไร พิมพ์บอกฉันด้านล่างได้เลย", voiceFail: "ถ้ายังไม่ได้ยินเสียงก็ไม่เป็นไร เราคุยต่อด้วยข้อความได้", preparing: "ฉันกำลังเตรียม Room พื้นฐานระหว่างที่ฟังคุณ…", ready: "Room พร้อมแล้ว เราจะคุยต่อกันที่นั่น", starters: ["คุณช่วยอะไรฉันได้บ้าง?", "แนะนำสิ่งที่ฉันต้องการ", "ช่วยฉันเริ่มเลย"], fallback: (input) => `ฉันได้ยินคุณว่า “${input}” ฉันเตรียม Room พื้นฐานแล้ว` },
  hi: { headline: "बोलिए। हम आपके लिए काम करेंगे।", greeting: "स्वागत है। मैं Royal Command AI हूँ। यहाँ नियंत्रण आपके हाथ में है। कुछ सीखने की ज़रूरत नहीं—बस बोलिए। मैं सुन रहा हूँ।", start: "AI शुरू करें", listening: "सुन रहा हूँ", speaking: "बोल रहा हूँ", thinking: "समझ रहा हूँ", paused: "जब चाहें बोलिए", placeholder: "या यहाँ लिखकर बताइए…", sound: "AI की आवाज़ सुनें", micFail: "माइक्रोफ़ोन अभी तैयार नहीं है। कोई बात नहीं, नीचे लिखकर बताइए।", voiceFail: "आवाज़ न आए तो भी ठीक है। हम टेक्स्ट में आगे बढ़ सकते हैं।", preparing: "आपकी बात सुनते हुए मैं आपका बेसिक Room तैयार कर रहा हूँ…", ready: "आपका Room तैयार है। वहीं इसी बातचीत को जारी रखूँगा।", starters: ["आप मेरे लिए क्या कर सकते हैं?", "मुझे क्या चाहिए, सुझाइए", "बस शुरू करने में मदद करें"], fallback: (input) => `मैंने सुना: “${input}”। मैंने एक बेसिक Room तैयार कर दिया है।` },
};

function localeFrom(value: string): LocaleKey {
  const v = value.toLowerCase();
  if (v.startsWith("ko")) return "ko";
  if (v.startsWith("ja")) return "ja";
  if (v.startsWith("zh")) return "zh";
  if (v.startsWith("vi")) return "vi";
  if (v.startsWith("id")) return "id";
  if (v.startsWith("th")) return "th";
  if (v.startsWith("hi")) return "hi";
  return "en";
}

function speechLanguage(locale: LocaleKey) {
  return ({ en: "en-AU", ko: "ko-KR", ja: "ja-JP", zh: "zh-CN", vi: "vi-VN", id: "id-ID", th: "th-TH", hi: "hi-IN" } as const)[locale];
}

type RecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
type RecognitionLike = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((event: RecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type RecognitionConstructor = new () => RecognitionLike;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const extended = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return extended.SpeechRecognition || extended.webkitSpeechRecognition || null;
}

function initialVoiceEnabled() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem("rc_audio_setup_v1");
  if (!raw) return true;
  try { return (JSON.parse(raw) as { voiceEnabled?: boolean }).voiceEnabled !== false; } catch { return true; }
}

function extractAiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const value = payload as Record<string, unknown>;
  if (typeof value.content === "string") return value.content;
  if (typeof value.answer === "string") return value.answer;
  const responses = Array.isArray(value.responses) ? value.responses : [];
  for (const item of responses) {
    if (item && typeof item === "object" && typeof (item as Record<string, unknown>).content === "string") return String((item as Record<string, unknown>).content);
  }
  return "";
}

export default function FirstMeetingWindowV2({ customer }: { customer: CustomerInfo }) {
  const router = useRouter();
  const locale = useMemo(() => localeFrom(customer.defaultLanguage || "en"), [customer.defaultLanguage]);
  const copy = COPY[locale];
  const [stage, setStage] = useState<Stage>("idle");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [showStarters, setShowStarters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceEnabled] = useState(initialVoiceEnabled);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const encounterIdRef = useRef("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem("rc_encounter_session_id");
    const encounterId = stored || crypto.randomUUID();
    encounterIdRef.current = encounterId;
    if (!stored) window.sessionStorage.setItem("rc_encounter_session_id", encounterId);
    const timer = window.setTimeout(() => setShowStarters(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
  }, []);

  function speak(message: string, onEnd?: () => void) {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = speechLanguage(locale);
    utterance.rate = 0.98;
    utterance.volume = 1;
    utterance.onstart = () => setStage("speaking");
    utterance.onend = () => { setStage("idle"); onEnd?.(); };
    utterance.onerror = () => { setStage("fallback"); setError(copy.voiceFail); onEnd?.(); };
    window.speechSynthesis.speak(utterance);
  }

  function startGreeting() {
    setError("");
    setCaption(copy.greeting);
    speak(copy.greeting);
  }

  function startListening() {
    if (busy) return;
    setError("");
    window.speechSynthesis?.cancel();
    const Recognition = getRecognitionConstructor();
    if (!Recognition) { setStage("fallback"); setError(copy.micFail); return; }
    try {
      const recognition = new Recognition();
      recognition.lang = speechLanguage(locale);
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
        if (transcript) void handleUserInput(transcript);
      };
      recognition.onerror = () => { setStage("fallback"); setError(copy.micFail); };
      recognition.onend = () => { recognitionRef.current = null; setStage((current) => current === "listening" ? "idle" : current); };
      recognitionRef.current = recognition;
      setStage("listening");
      recognition.start();
    } catch { setStage("fallback"); setError(copy.micFail); }
  }

  async function handleUserInput(input: string) {
    const clean = input.trim();
    if (!clean || busy) return;
    setBusy(true); setShowStarters(false); setText(""); setError(""); setCaption(clean); setStage("thinking");
    try {
      const params = new URLSearchParams(window.location.search);
      const templateId = params.get("template") || params.get("roomType") || params.get("type") || "custom";
      const encounterSessionId = encounterIdRef.current || crypto.randomUUID();
      const roomResponse = await fetch("/api/room-factory/rooms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, languageTag: customer.defaultLanguage || navigator.language || "en", countryCode: customer.countryCode || undefined, encounterSessionId }),
      });
      const roomPayload = await roomResponse.json().catch(() => ({}));
      if (!roomResponse.ok || !roomPayload?.room?.id) throw new Error("room-create");
      const roomId = String(roomPayload.room.id);
      setCaption(copy.preparing);

      let aiText = "";
      try {
        const providersResponse = await fetch("/api/ai/providers", { cache: "no-store" });
        const providerPayload = await providersResponse.json().catch(() => ({}));
        const ids = Array.isArray(providerPayload?.availableProviderIds) ? providerPayload.availableProviderIds : [];
        const provider = ["openai", "google", "anthropic", "xai", "codex"].find((id) => ids.includes(id)) || ids[0];
        if (provider) {
          const prompt = [
            "You are Royal Command AI meeting this customer for the first time.",
            "Be warm, concise and useful. Reflect what the customer said, then give one small practical success or next action immediately.",
            "Do not sell anything. Ask no more than one question. Never mention model/provider names.",
            "For regulated or high-risk topics, stay within safe information/organisation support and recommend professional confirmation when appropriate.",
            `Reply in the customer's language: ${customer.defaultLanguage || locale}.`,
            `Customer said: ${clean}`,
          ].join("\n");
          const aiResponse = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, prompt, language: customer.defaultLanguage || locale, providers: [provider] }) });
          if (aiResponse.ok) aiText = extractAiText(await aiResponse.json().catch(() => ({})));
        }
      } catch { aiText = ""; }

      const responseText = aiText.trim() || copy.fallback(clean);
      setCaption(`${responseText}\n\n${copy.ready}`);
      window.sessionStorage.setItem(`rc_first_meeting_${roomId}`, JSON.stringify({ encounterSessionId, user: clean, assistant: responseText }));
      const enterRoom = () => {
        if (window.sessionStorage.getItem("rc_encounter_session_id") === encounterSessionId) {
          window.sessionStorage.removeItem("rc_encounter_session_id");
          encounterIdRef.current = "";
        }
        router.push(`/rooms/${roomId}`);
      };
      speak(responseText, () => window.setTimeout(enterRoom, 700));
      if (!voiceEnabled) window.setTimeout(enterRoom, 1800);
    } catch {
      setStage("fallback"); setError(copy.voiceFail); setCaption(copy.fallback(clean));
    } finally { setBusy(false); }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void handleUserInput(text); }

  const status = stage === "listening" ? copy.listening : stage === "speaking" ? copy.speaking : stage === "thinking" ? copy.thinking : copy.paused;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,.12),transparent_38%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,.035),transparent_42%)]" />
      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center" aria-live="polite">
        <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--gold-soft)]">Royal Command AI</div>
        <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-full border border-[var(--gold)]/45 bg-black/30 shadow-[0_0_60px_rgba(212,175,55,.14)]" aria-label={status}>
          <div className={`h-16 w-16 rounded-full border border-[var(--gold)]/55 ${stage === "listening" || stage === "speaking" ? "animate-pulse bg-[var(--gold)]/15" : "bg-white/5"}`} />
        </div>
        <div className="mt-4 text-sm font-medium text-[var(--gold-soft)]">{status}</div>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl" style={{ fontFamily: "var(--font-display), serif" }}>{copy.headline}</h1>
        <p className="mt-6 min-h-16 max-w-2xl whitespace-pre-line text-base leading-7 text-[var(--muted)] md:text-lg">{caption || copy.greeting}</p>
        <button type="button" onClick={startListening} disabled={busy || stage === "thinking"} className="mt-8 flex min-h-24 min-w-24 items-center justify-center rounded-full border border-[var(--gold)]/70 bg-[var(--gold)]/12 shadow-[0_0_45px_rgba(212,175,55,.15)] transition hover:bg-[var(--gold)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50" aria-label={copy.start}><Mic size={38} /></button>
        <button type="button" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={startGreeting}><Volume2 size={16} /> {copy.sound}</button>
        {showStarters && !busy ? <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">{copy.starters.map((starter) => <button key={starter} type="button" onClick={() => void handleUserInput(starter)} className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm transition hover:border-[var(--gold)]/55">{starter}</button>)}</div> : null}
        <form onSubmit={onSubmit} className="mt-7 flex w-full max-w-xl gap-2">
          <input className="rc-input min-h-12 flex-1 text-base" value={text} onChange={(event) => setText(event.target.value)} placeholder={copy.placeholder} maxLength={2000} disabled={busy} />
          <button type="submit" className="rc-btn rc-btn-primary min-h-12 px-4" disabled={!text.trim() || busy} aria-label={copy.start}><Send size={18} /></button>
        </form>
        {error ? <p className="mt-4 max-w-xl text-sm text-[var(--danger)]">{error}</p> : null}
      </section>
    </main>
  );
}
