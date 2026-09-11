"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Copy, GripVertical, Menu, MessageSquare, Mic, Paperclip, Pencil, Plus, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import { FEATURED_LANGUAGE_ENTRIES, LOCALE_SEARCH_REGISTRY } from "@/lib/locale/localeSearchRegistry";
import { moveLanguageCountryLocale, normaliseLanguageCountryOrder, promoteLanguageCountryLocale } from "@/lib/locale/languageCountryOrder";
import { CREATE_ROOM_COUNTRIES, createRoomCopy } from "@/lib/rooms/create-room-i18n";
import styles from "./IndependentAIRooms.module.css";
import { useDomainRuntime } from "@/components/DomainRuntimeProvider";
import { getIntegrationEligibility } from "@/lib/ai/integrationEligibility";

type ProviderId = "openai" | "anthropic" | "google" | "xai" | "codex";
type ChatItem = { id: string; role: "user" | "assistant"; content: string; createdAt: string; title?: string; titleEdited?: boolean };
type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type CustomerRoom = { id: string; roomId?: string; name: string; status?: string };
type ProviderResult = {
  requestId: string;
  provider: ProviderId;
  providerName: string;
  content: string;
  model?: string;
  latencyMs?: number;
  error?: string | null;
  receipt?: { requestId: string; provider: string; terminal: boolean; completedAt: string };
};

type RoomState = {
  history: ChatItem[];
  loading: boolean;
  error: string;
  lastLatency?: number;
};

type ChatSession = {
  id: string;
  title: string;
  titleEdited?: boolean;
  updatedAt: string;
  histories: Record<ProviderId, ChatItem[]>;
  serverStored?: boolean;
};

const PROVIDERS: Array<{ id: ProviderId; name: string; role: string }> = [
  { id: "openai", name: "ChatGPT", role: "Independent AI Room" },
  { id: "anthropic", name: "Claude", role: "Independent AI Room" },
  { id: "google", name: "Gemini", role: "Independent AI Room" },
  { id: "xai", name: "Grok", role: "Independent AI Room" },
  { id: "codex", name: "Codex", role: "Independent AI Room" },
];
const DEFAULT_SELECTED_PROVIDERS = PROVIDERS.map((provider) => provider.id);
const DEFAULT_PROVIDER_ORDER = [...DEFAULT_SELECTED_PROVIDERS];
const DEFAULT_LANGUAGE_COUNTRY_ORDER = FEATURED_LANGUAGE_ENTRIES.map((entry) => entry.locale);

const EMPTY: RoomState = { history: [], loading: false, error: "" };
const HIDDEN_COUNTRIES_KEY = "royalcommand:hidden-countries";
const LANGUAGE_COUNTRY_ORDER_KEY = "royalcommand:language-country-order";
const SEND_LABELS: Record<string, string> = {
  ar: "إرسال", de: "Senden", en: "Send", es: "Enviar", fr: "Envoyer", hi: "भेजें",
  id: "Kirim", it: "Invia", ja: "送信", ko: "전송", pt: "Enviar", ru: "Отправить",
  th: "ส่ง", tr: "Gönder", vi: "Gửi", zh: "发送",
};

function emptyHistories(): Record<ProviderId, ChatItem[]> {
  return { openai: [], anthropic: [], google: [], xai: [], codex: [] };
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function historyKey(roomId: string, provider: ProviderId) {
  return `royalcommand:independent-ai:v1:${roomId}:${provider}:history`;
}

function selectedKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:selected`;
}

function chatSessionsKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:chat-sessions`;
}

function activeChatSessionKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:active-chat-session`;
}

function providerOrderKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:provider-order`;
}

function integrationSnapshotKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:final-integrator`;
}

function countryCodeForLocale(locale: string) {
  const parts = locale.split("-");
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (/^[A-Z]{2}$/i.test(parts[index])) return parts[index].toUpperCase();
  }
  return "";
}

function CountryFlag({ countryCode }: { countryCode: string }) {
  const normalizedCode = countryCode.toLowerCase();
  return <span aria-hidden="true" className="inline-block h-[15px] w-5 shrink-0 rounded-[2px] bg-cover bg-center shadow-[0_0_0_1px_rgba(255,255,255,0.14)]" style={{ backgroundImage: `url("https://flagcdn.com/20x15/${normalizedCode}.png")` }}/>;
}

function countryNameForLocale(locale: string, label: string) {
  const labelledCountry = label.match(/\(([^)]+)\)\s*$/)?.[1];
  if (labelledCountry) return labelledCountry;
  const countryCode = countryCodeForLocale(locale);
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || countryCode; } catch { return countryCode; }
}

function ProviderBrandLogo({ provider }: { provider: ProviderId }) {
  const baseClass = "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm";
  if (provider === "openai" || provider === "codex") return <span className={baseClass} style={{ background: "#10a37f" }}><img src="/rc-ai-logos/openai.svg" alt="" className="h-[18px] w-[18px]"/></span>;
  if (provider === "anthropic") return <span className={baseClass} style={{ background: "#d97757", color: "#fff4e8" }}>AI</span>;
  if (provider === "google") return <span className={baseClass} style={{ background: "linear-gradient(135deg, #4285f4 0%, #8e75f6 52%, #d96570 100%)" }}>✦</span>;
  return <span className={baseClass} style={{ background: "#000000" }}>𝕏</span>;
}

export default function IndependentAIRooms({ roomId: roomIdProp }: { roomId?: string } = {}) {
  const runtimeContext = useDomainRuntime();
  const params = useParams<{ id: string }>();
  const roomId = roomIdProp || params.id || "rca";
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProviderId[]>(DEFAULT_SELECTED_PROVIDERS);
  const [selectedLoaded, setSelectedLoaded] = useState(false);
  const [rooms, setRooms] = useState<Record<ProviderId, RoomState>>({
    openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY },
  });
  const [openRoom, setOpenRoom] = useState<ProviderId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [userWantsListening, setUserWantsListening] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [manualStop, setManualStop] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [language, setLanguage] = useState(() => runtimeContext.locale.split("-")[0].toLowerCase());
  const [selectedLocale, setSelectedLocale] = useState(runtimeContext.locale);
  const [hiddenCountries, setHiddenCountries] = useState<Set<string>>(new Set());
  const [languageCountryOrder, setLanguageCountryOrder] = useState<string[]>(DEFAULT_LANGUAGE_COUNTRY_ORDER);
  const [providerSearch, setProviderSearch] = useState("");
  const [customerRooms, setCustomerRooms] = useState<CustomerRoom[]>([]);
  const [languageSearch, setLanguageSearch] = useState("");
  const [providerRegistry, setProviderRegistry] = useState<ProviderInfo[]>([]);
  const [accountConnectedProviders, setAccountConnectedProviders] = useState<Set<string>>(new Set());
  const [providerOrder, setProviderOrder] = useState<string[]>(DEFAULT_PROVIDER_ORDER);
  const [providerOrderLoaded, setProviderOrderLoaded] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatSessionsLoaded, setChatSessionsLoaded] = useState(false);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roomPrompt, setRoomPrompt] = useState("");
  const [allPrompt, setAllPrompt] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [cardPrompts, setCardPrompts] = useState<Record<ProviderId, string>>({ openai: "", anthropic: "", google: "", xai: "", codex: "" });
  const [expandedAnswers, setExpandedAnswers] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [frozenResults, setFrozenResults] = useState<Record<string, ProviderResult>>({});
  const [frozenQuestion, setFrozenQuestion] = useState("");
  const [integrated, setIntegrated] = useState("");
  const [integrating, setIntegrating] = useState(false);
  const [integrationError, setIntegrationError] = useState("");
  const [integrationSnapshotLoaded, setIntegrationSnapshotLoaded] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const aborters = useRef(new Map<string, AbortController>());
  const integrationInFlightRef = useRef(false);
  const executionGeneration = useRef(0);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const userWantsListeningRef = useRef(false);
  const manualStopRef = useRef(true);
  const recognitionTargetRef = useRef<"all" | "room">("room");
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionGenerationRef = useRef(0);
  const recognitionSessionRef = useRef(0);
  const consumedFinalKeysRef = useRef(new Set<string>());
  const consumedFinalTranscriptsRef = useRef(new Set<string>());
  const draggedProviderRef = useRef<string | null>(null);
  const draggedLanguageLocaleRef = useRef<string | null>(null);
  const openRoomRef = useRef<ProviderId | null>(null);
  const roomPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const followLatestRoomPromptRef = useRef(true);
  const activeChatSessionIdRef = useRef<string | null>(null);
  const serverSessionPromiseRef = useRef<Promise<string | null> | null>(null);
  openRoomRef.current = openRoom;

  useEffect(() => {
    void fetch("/api/ai/providers", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const registry = (data?.connectors || []) as ProviderInfo[];
        const ids = new Set<string>(registry.filter((p) => p.available).map((p) => p.id));
        setProviderRegistry(registry);
        setConnected(ids);
      })
      .catch(() => setGlobalError("AI provider status could not be loaded."));

    void Promise.all([
      fetch("/api/rooms", { cache: "no-store" }).then((res) => res.ok ? res.json() : { rooms: [] }),
      fetch("/api/room-factory/rooms", { cache: "no-store" }).then((res) => res.ok ? res.json() : { rooms: [] }),
    ]).then(([standardData, factoryData]) => {
      const standardRooms = Array.isArray(standardData?.rooms) ? standardData.rooms as CustomerRoom[] : [];
      const factoryRooms = Array.isArray(factoryData?.rooms) ? factoryData.rooms as CustomerRoom[] : [];
      const unique = new Map<string, CustomerRoom>();
      for (const room of [...factoryRooms, ...standardRooms]) {
        const id = String(room?.roomId || room?.id || "");
        if (!id || !room?.name || room.status === "archived" || id.toLowerCase() === "rca") continue;
        if (!unique.has(id)) unique.set(id, { ...room, id });
      }
      setCustomerRooms(Array.from(unique.values()));
    }).catch(() => setCustomerRooms([]));

    const next = { openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY } } as Record<ProviderId, RoomState>;
    for (const provider of PROVIDERS) {
      try {
        const saved = JSON.parse(localStorage.getItem(historyKey(roomId, provider.id)) || "[]") as ChatItem[];
        next[provider.id] = { ...EMPTY, history: Array.isArray(saved) ? saved.slice(-120) : [] };
      } catch {}
    }
    setRooms(next);
    try {
      const storedSelected = localStorage.getItem(selectedKey(roomId));
      const savedSelected = storedSelected === null ? DEFAULT_SELECTED_PROVIDERS : JSON.parse(storedSelected) as ProviderId[];
      setSelected(Array.isArray(savedSelected) ? savedSelected.filter((id) => PROVIDERS.some((p) => p.id === id)) : DEFAULT_SELECTED_PROVIDERS);
    } catch {
      setSelected(DEFAULT_SELECTED_PROVIDERS);
    } finally {
      setSelectedLoaded(true);
    }
    try {
      const savedProviderOrder = JSON.parse(localStorage.getItem(providerOrderKey(roomId)) || "[]") as string[];
      const validSavedOrder = Array.isArray(savedProviderOrder) ? savedProviderOrder.filter((id): id is string => typeof id === "string") : [];
      setProviderOrder(validSavedOrder.length ? validSavedOrder : DEFAULT_PROVIDER_ORDER);
    } catch {
      setProviderOrder(DEFAULT_PROVIDER_ORDER);
    } finally {
      setProviderOrderLoaded(true);
    }
    try {
      const savedIntegration = JSON.parse(localStorage.getItem(integrationSnapshotKey(roomId)) || "null") as {
        question?: unknown;
        results?: unknown;
        integrated?: unknown;
      } | null;
      if (savedIntegration && typeof savedIntegration.question === "string" && savedIntegration.results && typeof savedIntegration.results === "object") {
        setFrozenQuestion(savedIntegration.question);
        setFrozenResults(savedIntegration.results as Record<string, ProviderResult>);
        if (typeof savedIntegration.integrated === "string") setIntegrated(savedIntegration.integrated);
      }
    } catch {
      localStorage.removeItem(integrationSnapshotKey(roomId));
    } finally {
      setIntegrationSnapshotLoaded(true);
    }
    const savedLocale = localStorage.getItem("royalcommand:ui-locale");
    if (savedLocale && LOCALE_SEARCH_REGISTRY.some((entry) => entry.locale === savedLocale)) {
      setSelectedLocale(savedLocale);
      setLanguage(savedLocale.split("-")[0].toLowerCase());
    }
    try {
      const savedHiddenCountries = JSON.parse(localStorage.getItem(HIDDEN_COUNTRIES_KEY) || "[]") as string[];
      setHiddenCountries(new Set(savedHiddenCountries.filter((code) => /^[A-Z]{2}$/.test(code))));
    } catch {}
    try {
      const savedLanguageOrder = JSON.parse(localStorage.getItem(LANGUAGE_COUNTRY_ORDER_KEY) || "[]") as string[];
      const validLocales = new Set(LOCALE_SEARCH_REGISTRY.map((entry) => entry.locale));
      const nextOrder = normaliseLanguageCountryOrder(savedLanguageOrder, validLocales);
      if (nextOrder.length) setLanguageCountryOrder(nextOrder);
    } catch {}
    void fetch("/api/user/preferences", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const preferences = data?.preferences;
        if (!preferences) return;
        const savedConnections = Array.isArray(preferences.connectedAiProviders)
          ? preferences.connectedAiProviders.filter((id: unknown): id is string => typeof id === "string")
          : data?.layoutEditorAllowed
            ? DEFAULT_SELECTED_PROVIDERS
            : [];
        setAccountConnectedProviders(new Set(savedConnections));
        if (typeof preferences.uiLocale === "string" && LOCALE_SEARCH_REGISTRY.some((entry) => entry.locale === preferences.uiLocale)) {
          setSelectedLocale(preferences.uiLocale);
          setLanguage(preferences.uiLocale.split("-")[0].toLowerCase());
          localStorage.setItem("royalcommand:ui-locale", preferences.uiLocale);
        }
        if (Array.isArray(preferences.hiddenCountries)) {
          const nextHidden = preferences.hiddenCountries.filter((code: unknown): code is string => typeof code === "string" && /^[A-Z]{2}$/.test(code));
          setHiddenCountries(new Set(nextHidden));
          localStorage.setItem(HIDDEN_COUNTRIES_KEY, JSON.stringify(nextHidden));
        }
        if (Array.isArray(preferences.languageCountryOrder)) {
          const validLocales = new Set(LOCALE_SEARCH_REGISTRY.map((entry) => entry.locale));
          const nextOrder = normaliseLanguageCountryOrder(preferences.languageCountryOrder, validLocales);
          if (nextOrder.length) {
            setLanguageCountryOrder(nextOrder);
            localStorage.setItem(LANGUAGE_COUNTRY_ORDER_KEY, JSON.stringify(nextOrder));
          }
        }
      })
      .catch(() => {});
    try {
      const savedSessions = JSON.parse(localStorage.getItem(chatSessionsKey(roomId)) || "[]") as ChatSession[];
      setChatSessions(Array.isArray(savedSessions) ? savedSessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []);
      const savedActiveId = localStorage.getItem(activeChatSessionKey(roomId));
      activeChatSessionIdRef.current = savedActiveId;
      setActiveChatSessionId(savedActiveId);
    } catch {
      setChatSessions([]);
    } finally {
      setChatSessionsLoaded(true);
    }
    void fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const serverSessions = Array.isArray(data?.conversations) ? data.conversations.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          title: String(row.title || "New Chat"),
          updatedAt: String(row.last_message_at || row.updated_at || new Date().toISOString()),
          histories: emptyHistories(),
          serverStored: true,
        })) : [];
        setChatSessions((current) => [...serverSessions, ...current.filter((item) => !serverSessions.some((server: ChatSession) => server.id === item.id))]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100));
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!chatSessionsLoaded) return;
    localStorage.setItem(chatSessionsKey(roomId), JSON.stringify(chatSessions.slice(0, 100)));
  }, [chatSessions, chatSessionsLoaded, roomId]);

  useEffect(() => {
    if (!chatSessionsLoaded) return;
    activeChatSessionIdRef.current = activeChatSessionId;
    if (activeChatSessionId) localStorage.setItem(activeChatSessionKey(roomId), activeChatSessionId);
    else localStorage.removeItem(activeChatSessionKey(roomId));
  }, [activeChatSessionId, chatSessionsLoaded, roomId]);

  useEffect(() => {
    const closePanels = (event: globalThis.KeyboardEvent | MouseEvent) => {
      if (event instanceof globalThis.KeyboardEvent && event.key === "Escape") {
        setMenuOpen(false); setChatsOpen(false); setLanguageOpen(false);
      }
      if (event instanceof MouseEvent && event.target instanceof Element && !event.target.closest("[data-rc-top-controls]")) {
        setMenuOpen(false); setChatsOpen(false); setLanguageOpen(false);
      }
    };
    document.addEventListener("keydown", closePanels);
    document.addEventListener("mousedown", closePanels);
    return () => { document.removeEventListener("keydown", closePanels); document.removeEventListener("mousedown", closePanels); };
  }, []);

  useEffect(() => {
    if (!selectedLoaded) return;
    localStorage.setItem(selectedKey(roomId), JSON.stringify(selected));
  }, [roomId, selected, selectedLoaded]);

  useEffect(() => {
    const fastProviderScroll = (event: DragEvent) => {
      if (!draggedProviderRef.current) return;
      if (event.clientY <= 0) return;
      const search = document.querySelector<HTMLInputElement>('input[placeholder="Search AI providers"]');
      const list = search?.parentElement?.parentElement?.nextElementSibling;
      if (!(list instanceof HTMLElement)) return;
      const bounds = list.getBoundingClientRect();
      const upperTrigger = bounds.top + 110;
      const lowerTrigger = bounds.bottom - 110;
      if (event.clientY < upperTrigger) {
        if (event.type === "dragover") event.preventDefault();
        list.scrollTop -= Math.min(220, 35 + (upperTrigger - event.clientY) * 1.5);
      } else if (event.clientY > lowerTrigger) {
        if (event.type === "dragover") event.preventDefault();
        list.scrollTop += Math.min(220, 35 + (event.clientY - lowerTrigger) * 1.5);
      }
    };
    document.addEventListener("drag", fastProviderScroll);
    document.addEventListener("dragover", fastProviderScroll);
    return () => {
      document.removeEventListener("drag", fastProviderScroll);
      document.removeEventListener("dragover", fastProviderScroll);
    };
  }, []);

  useEffect(() => {
    if (!providerOrderLoaded) return;
    localStorage.setItem(providerOrderKey(roomId), JSON.stringify(providerOrder));
  }, [providerOrder, providerOrderLoaded, roomId]);

  useEffect(() => {
    for (const provider of PROVIDERS) {
      localStorage.setItem(historyKey(roomId, provider.id), JSON.stringify(rooms[provider.id].history.slice(-120)));
    }
  }, [roomId, rooms]);

  useEffect(() => {
    if (!integrationSnapshotLoaded) return;
    if (!frozenQuestion) {
      localStorage.removeItem(integrationSnapshotKey(roomId));
      return;
    }
    localStorage.setItem(integrationSnapshotKey(roomId), JSON.stringify({
      question: frozenQuestion,
      results: frozenResults,
      integrated,
    }));
  }, [frozenQuestion, frozenResults, integrated, integrationSnapshotLoaded, roomId]);

  useEffect(() => () => {
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
    recognitionGenerationRef.current += 1;
    userWantsListeningRef.current = false;
    manualStopRef.current = true;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    recognitionActiveRef.current = false;
  }, []);

  useEffect(() => {
    const textarea = roomPromptRef.current;
    if (!textarea) return;
    autoSizeRoomPrompt(textarea);
    if (followLatestRoomPromptRef.current) textarea.scrollTop = textarea.scrollHeight;
  }, [roomPrompt]);

  const selectedConnected = useMemo(() => selected.filter((id) => connected.has(id)), [selected, connected]);
  const integrationEligibility = useMemo(
    () => getIntegrationEligibility(selectedConnected, frozenResults),
    [selectedConnected, frozenResults],
  );
  const frozenList = integrationEligibility.successfulResults;
  const failedFrozenList = integrationEligibility.failedResults;
  const canIntegrate = Boolean(frozenQuestion && integrationEligibility.canIntegrate && !integrated);

  function setProviderState(provider: ProviderId, patch: Partial<RoomState>) {
    setRooms((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  }

  function append(provider: ProviderId, item: ChatItem) {
    setRooms((prev) => ({ ...prev, [provider]: { ...prev[provider], history: [...prev[provider].history, item].slice(-120) } }));
  }

  function applyGeneratedTitle(provider: ProviderId, itemId: string, title: string) {
    setRooms((prev) => ({ ...prev, [provider]: { ...prev[provider], history: prev[provider].history.map((item) => item.id === itemId && !item.titleEdited ? { ...item, title } : item) } }));
  }

  function fallbackTitle(text: string) {
    const normalized = text.replace(/\s+/g, " ").replace(/^(please|can you|could you|질문|문의|요청)[:\s,-]*/i, "").trim();
    if (!normalized) return language === "ko" ? "새 대화" : "New chat";
    return normalized.length > 50 ? `${normalized.slice(0, 49).trim()}…` : normalized;
  }

  function cleanGeneratedTitle(value: string, fallback: string) {
    const title = value.replace(/^[#*\s"'`]+|[#*\s"'`]+$/g, "").replace(/^(title|제목)\s*:\s*/i, "").replace(/\s+/g, " ").trim();
    if (!title) return fallback;
    return title.length > 60 ? `${title.slice(0, 59).trim()}…` : title;
  }

  function answerTitle(question: string, answer: string) {
    const firstMeaningfulLine = answer.split("\n").map((line) => line.replace(/^\s*#{1,6}\s*|[*_`]/g, "").trim()).find((line) => line.length >= 8);
    return cleanGeneratedTitle(firstMeaningfulLine || answer || question, fallbackTitle(answer || question));
  }

  async function generateChatTitle(question: string) {
    const fallback = fallbackTitle(question);
    const instruction = `Create one concise, descriptive chat title from the entire user request below. Do not copy its first sentence. Use the same language as the request. Return only the title, ideally 20-50 characters.\n\nUSER REQUEST:\n${question}`;
    try {
      const response = await fetch("/api/ai/helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, message: instruction, selectedLanguage: language, history: [] }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.answer) return fallback;
      return cleanGeneratedTitle(String(data.answer), fallback);
    } catch {
      return fallback;
    }
  }

  function toggleSelected(provider: ProviderId) {
    if (!connected.has(provider)) return;
    setSelected((prev) => prev.includes(provider) ? prev.filter((id) => id !== provider) : [...prev, provider]);
  }

  function stopMic() {
    recognitionGenerationRef.current += 1;
    userWantsListeningRef.current = false;
    manualStopRef.current = true;
    setUserWantsListening(false);
    setManualStop(true);
    setRecognitionActive(false);
    setInterimTranscript("");
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognitionActiveRef.current = false;
    try { recognition?.abort(); } catch {}
  }

  function startRecognition(target: "all" | "room", generation: number) {
    if (generation !== recognitionGenerationRef.current || manualStopRef.current || !userWantsListeningRef.current || recognitionRef.current) return;
    if (target === "room" && !openRoomRef.current) {
      stopMic();
      return;
    }
    setGlobalError("");
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      userWantsListeningRef.current = false;
      setUserWantsListening(false);
      manualStopRef.current = true;
      setManualStop(true);
      setGlobalError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SR();
    const sessionId = ++recognitionSessionRef.current;
    recognitionRef.current = recognition;
    recognitionTargetRef.current = target;
    recognition.lang = selectedLocale;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => {
      if (generation !== recognitionGenerationRef.current || recognitionRef.current !== recognition) {
        try { recognition.abort(); } catch {}
        return;
      }
      recognitionActiveRef.current = true;
      setRecognitionActive(true);
    };
    recognition.onend = () => {
      if (generation !== recognitionGenerationRef.current || recognitionRef.current !== recognition) return;
      recognitionActiveRef.current = false;
      recognitionRef.current = null;
      setRecognitionActive(false);
      setInterimTranscript("");
      if (manualStopRef.current || !userWantsListeningRef.current || (target === "room" && !openRoomRef.current)) return;
      recognitionRestartTimerRef.current = setTimeout(() => {
        recognitionRestartTimerRef.current = null;
        startRecognition(recognitionTargetRef.current, generation);
      }, 250);
    };
    recognition.onerror = (event: any) => {
      if (generation !== recognitionGenerationRef.current || recognitionRef.current !== recognition) return;
      recognitionActiveRef.current = false;
      setRecognitionActive(false);
      if (event?.error === "aborted" && manualStopRef.current) return;
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        stopMic();
        setGlobalError("Microphone permission was not granted.");
      }
    };
    recognition.onresult = (event: any) => {
      if (generation !== recognitionGenerationRef.current || recognitionRef.current !== recognition || manualStopRef.current) return;
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = String(result?.[0]?.transcript || "").replace(/\s+/g, " ").trim();
        if (!transcript) continue;
        if (!result.isFinal) {
          interimParts.push(transcript);
          continue;
        }
        const normalizedTranscript = transcript.toLocaleLowerCase();
        const resultKey = `${generation}:${sessionId}:${index}:${normalizedTranscript}`;
        const transcriptKey = `${generation}:${normalizedTranscript}`;
        if (consumedFinalKeysRef.current.has(resultKey) || consumedFinalTranscriptsRef.current.has(transcriptKey)) continue;
        consumedFinalKeysRef.current.add(resultKey);
        consumedFinalTranscriptsRef.current.add(transcriptKey);
        finalParts.push(transcript);
      }
      setInterimTranscript(interimParts.join(" "));
      const finalText = finalParts.join(" ");
      if (!finalText) return;
      if (target === "all") setAllPrompt((prev) => prev ? `${prev.trimEnd()} ${finalText}` : finalText);
      else setRoomPrompt((prev) => prev ? `${prev.trimEnd()} ${finalText}` : finalText);
    };
    try {
      recognition.start();
    } catch {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      recognitionActiveRef.current = false;
      setRecognitionActive(false);
      stopMic();
      setGlobalError("Microphone could not start.");
    }
  }

  function toggleMic(target: "all" | "room") {
    if (userWantsListeningRef.current) {
      stopMic();
      return;
    }
    const generation = recognitionGenerationRef.current + 1;
    recognitionGenerationRef.current = generation;
    consumedFinalKeysRef.current.clear();
    consumedFinalTranscriptsRef.current.clear();
    manualStopRef.current = false;
    setManualStop(false);
    userWantsListeningRef.current = true;
    setUserWantsListening(true);
    recognitionTargetRef.current = target;
    startRecognition(target, generation);
  }

  function autoSizeRoomPrompt(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > textarea.clientHeight ? "auto" : "hidden";
  }

  function handleRoomPromptChange(textarea: HTMLTextAreaElement) {
    followLatestRoomPromptRef.current = textarea.selectionStart === textarea.value.length;
    setRoomPrompt(textarea.value);
  }

  function handleRoomPromptScroll(textarea: HTMLTextAreaElement) {
    followLatestRoomPromptRef.current = textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight < 24;
  }

  async function ensureServerSession(title: string) {
    if (activeChatSessionIdRef.current) return activeChatSessionIdRef.current;
    if (serverSessionPromiseRef.current) return serverSessionPromiseRef.current;
    serverSessionPromiseRef.current = fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.conversation?.id) return null;
      const id = String(data.conversation.id);
      activeChatSessionIdRef.current = id;
      setActiveChatSessionId(id);
      setChatSessions((current) => [{
        id,
        title: String(data.conversation.title || title),
        updatedAt: String(data.conversation.last_message_at || new Date().toISOString()),
        histories: emptyHistories(),
        serverStored: true,
      }, ...current.filter((session) => session.id !== id)].slice(0, 100));
      return id;
    }).catch(() => null).finally(() => { serverSessionPromiseRef.current = null; });
    return serverSessionPromiseRef.current;
  }

  async function persistServerMessage(conversationId: string | null, provider: ProviderId, item: ChatItem) {
    if (!conversationId) return;
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, role: item.role, content: item.content, clientItemId: item.id, title: item.title, titleEdited: item.titleEdited }),
    }).catch(() => null);
  }

  async function updateServerChatTitle(title: string) {
    const conversationId = activeChatSessionIdRef.current;
    if (!conversationId) return;
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations/${encodeURIComponent(conversationId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);
    setChatSessions((current) => current.map((session) => session.id === conversationId ? { ...session, title } : session));
  }

  async function askProvider(provider: ProviderId, prompt: string, selectedSet: ProviderId[], generation: number, chatTitlePromise?: Promise<string>, updateServerTitleOnce = true) {
    if (!connected.has(provider)) return null;
    const requestId = uid(`${provider}-request`);
    const controller = new AbortController();
    aborters.current.set(provider, controller);
    setProviderState(provider, { loading: true, error: "" });
    const userItemId = uid("user");
    const userItem: ChatItem = { id: userItemId, role: "user", content: prompt, createdAt: new Date().toISOString(), title: fallbackTitle(prompt) };
    append(provider, userItem);
    const serverSessionPromise = ensureServerSession(userItem.title || "New Chat");
    void serverSessionPromise.then((serverSessionId) => persistServerMessage(serverSessionId, provider, userItem));
    if (chatTitlePromise) void chatTitlePromise.then((title) => { applyGeneratedTitle(provider, userItemId, title); if (updateServerTitleOnce) void updateServerChatTitle(title); });

    try {
      const history = rooms[provider].history.slice(-24).map((item) => ({ role: item.role, content: item.content }));
      const res = await fetch("/api/ai/independent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ requestId, provider, selectedProviders: selectedSet, prompt, language, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (generation !== executionGeneration.current) return null;
      if (!res.ok || data?.error) throw new Error(data?.error || "AI request failed");
      const result = data as ProviderResult;
      const assistantItemId = uid("assistant");
      const assistantItem: ChatItem = { id: assistantItemId, role: "assistant", content: result.content, createdAt: new Date().toISOString(), title: answerTitle(prompt, result.content) };
      append(provider, assistantItem);
      void serverSessionPromise.then((serverSessionId) => persistServerMessage(serverSessionId, provider, assistantItem));
      setProviderState(provider, { loading: false, error: "", lastLatency: result.latencyMs });
      return result;
    } catch (error) {
      if (controller.signal.aborted || generation !== executionGeneration.current) return null;
      const message = error instanceof Error ? error.message : "AI request failed";
      setProviderState(provider, { loading: false, error: message });
      return { requestId, provider, providerName: PROVIDERS.find((p) => p.id === provider)?.name || provider, content: "", error: message } as ProviderResult;
    } finally {
      aborters.current.delete(provider);
      setProviderState(provider, { loading: false });
    }
  }

  async function submitSingle(e?: FormEvent) {
    e?.preventDefault();
    if (!openRoom || !roomPrompt.trim()) return;
    const prompt = roomPrompt.trim();
    setRoomPrompt("");
    const generation = ++executionGeneration.current;
    await askProvider(openRoom, prompt, [openRoom], generation, generateChatTitle(prompt));
  }

  async function submitSelected(e?: FormEvent) {
    e?.preventDefault();
    const prompt = allPrompt.trim();
    const target = selectedConnected;
    if (!prompt || !target.length) return;
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
    const generation = ++executionGeneration.current;
    integrationInFlightRef.current = false;
    setFrozenQuestion(prompt);
    setFrozenResults({});
    setIntegrated("");
    setIntegrationError("");
    setGlobalError("");
    const snapshot = [...target];
    const chatTitlePromise = generateChatTitle(prompt);
    setAllPrompt("");
    setAttachments([]);

    await Promise.all(snapshot.map(async (provider, index) => {
      const result = await askProvider(provider, prompt, snapshot, generation, chatTitlePromise, index === 0);
      if (!result || generation !== executionGeneration.current) return;
      setFrozenResults((prev) => ({ ...prev, [provider]: Object.freeze({ ...result }) }));
    }));
  }

  function addAttachments(files: FileList | File[]) {
    setAttachments((current) => {
      const next = [...current];
      for (const file of Array.from(files)) {
        if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
      }
      return next;
    });
  }

  async function submitCard(provider: ProviderId) {
    const prompt = cardPrompts[provider].trim();
    if (!prompt || !connected.has(provider) || rooms[provider].loading) return;
    setCardPrompts((current) => ({ ...current, [provider]: "" }));
    setExpandedAnswers((current) => ({ ...current, [provider]: false }));
    const generation = executionGeneration.current;
    await askProvider(provider, prompt, [provider], generation, generateChatTitle(prompt));
  }

  function handleCardPromptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>, provider: ProviderId) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.style.height = "auto";
    void submitCard(provider);
  }

  function autoSizeCardPrompt(target: HTMLTextAreaElement) {
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }

  function currentSessionSnapshot(id = activeChatSessionIdRef.current || uid("chat")): ChatSession | null {
    const allItems = PROVIDERS.flatMap((provider) => rooms[provider.id].history);
    if (!allItems.length) return null;
    const latestQuestion = allItems.filter((item) => item.role === "user").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      id,
      title: latestQuestion?.title || fallbackTitle(latestQuestion?.content || "") || "Saved chat",
      titleEdited: latestQuestion?.titleEdited,
      updatedAt: new Date().toISOString(),
      histories: Object.fromEntries(PROVIDERS.map((provider) => [provider.id, [...rooms[provider.id].history]])) as Record<ProviderId, ChatItem[]>,
    };
  }

  function archiveCurrentSession() {
    const snapshot = currentSessionSnapshot();
    if (!snapshot) return;
    setChatSessions((current) => {
      const existing = current.find((session) => session.id === snapshot.id);
      const updated = existing ? { ...snapshot, serverStored: existing.serverStored } : snapshot;
      return [updated, ...current.filter((session) => session.id !== snapshot.id)].slice(0, 100);
    });
  }

  function startNewChat() {
    archiveCurrentSession();
    cancelAll();
    setRooms({ openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY } });
    activeChatSessionIdRef.current = null; setActiveChatSessionId(null); setDeleteConfirmId(null); setOpenRoom(null); setFrozenQuestion(""); setFrozenResults({}); setIntegrated(""); setIntegrationError(""); setGlobalError(""); setMenuOpen(false);
  }

  async function loadChatSession(session: ChatSession) {
    archiveCurrentSession();
    let histories = session.histories;
    if (session.serverStored) {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations/${encodeURIComponent(session.id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setGlobalError(data?.error || "Unable to load chat history"); return; }
      histories = emptyHistories();
      for (const row of Array.isArray(data?.messages) ? data.messages : []) {
        const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
        const provider = metadata.provider;
        if (metadata.source !== "rca-independent" || !PROVIDERS.some((item) => item.id === provider)) continue;
        histories[provider as ProviderId].push({
          id: typeof metadata.clientItemId === "string" ? metadata.clientItemId : String(row.id),
          role: row.author_type === "user" ? "user" : "assistant",
          content: String(row.content || ""),
          createdAt: String(row.created_at || new Date().toISOString()),
          title: typeof metadata.title === "string" ? metadata.title : undefined,
          titleEdited: metadata.titleEdited === true,
        });
      }
    }
    setRooms(Object.fromEntries(PROVIDERS.map((provider) => [provider.id, { ...EMPTY, history: [...(histories[provider.id] || [])] }])) as Record<ProviderId, RoomState>);
    activeChatSessionIdRef.current = session.id; setActiveChatSessionId(session.id); setDeleteConfirmId(null); setOpenRoom(null); setFrozenQuestion(""); setFrozenResults({}); setIntegrated(""); setIntegrationError(""); setGlobalError(""); setMenuOpen(false);
  }

  function editCurrentChatTitle() {
    const nextTitle = window.prompt("Edit chat title", currentChatTitle)?.replace(/\s+/g, " ").trim();
    if (!nextTitle) return;
    setRooms((prev) => Object.fromEntries(PROVIDERS.map((provider) => {
      const history = [...prev[provider.id].history];
      const questionIndex = history.map((item) => item.role).lastIndexOf("user");
      if (questionIndex >= 0) history[questionIndex] = { ...history[questionIndex], title: nextTitle.slice(0, 60), titleEdited: true };
      return [provider.id, { ...prev[provider.id], history }];
    })) as Record<ProviderId, RoomState>);
    void updateServerChatTitle(nextTitle.slice(0, 60));
  }

  function editSavedChatTitle(session: ChatSession) {
    const nextTitle = window.prompt("Edit chat title", session.title)?.replace(/\s+/g, " ").trim();
    if (!nextTitle) return;
    setChatSessions((current) => current.map((item) => item.id === session.id ? { ...item, title: nextTitle.slice(0, 60), titleEdited: true } : item));
    if (session.serverStored) void fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations/${encodeURIComponent(session.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: nextTitle.slice(0, 60) }) });
  }

  function clearCurrentChatWithoutArchive() {
    cancelAll();
    stopMic();
    setRooms({ openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY } });
    activeChatSessionIdRef.current = null; setActiveChatSessionId(null); setOpenRoom(null); setFrozenQuestion(""); setFrozenResults({}); setIntegrated(""); setIntegrationError(""); setGlobalError("");
  }

  function deleteChatSession(sessionId: string) {
    const deletesCurrent = sessionId === "current" || sessionId === activeChatSessionId;
    const storedId = sessionId === "current" ? activeChatSessionId : sessionId;
    if (storedId) setChatSessions((current) => current.filter((session) => session.id !== storedId));
    const storedSession = storedId ? chatSessions.find((session) => session.id === storedId) : null;
    if (storedId && storedSession?.serverStored) void fetch(`/api/rooms/${encodeURIComponent(roomId)}/conversations/${encodeURIComponent(storedId)}`, { method: "DELETE" });
    if (deletesCurrent) clearCurrentChatWithoutArchive();
    setDeleteConfirmId(null);
  }

  function chooseProvider(id: string) {
    const provider = PROVIDERS.find((item) => item.id === id);
    if (!provider || !connected.has(id)) return;
    toggleSelected(provider.id);
  }

  function dropProvider(targetId: string, placeAfter: boolean) {
    setProviderOrder((current) => {
      const registryIds = providerRegistry.map((provider) => provider.id);
      const orderedIds = [...current.filter((providerId) => registryIds.includes(providerId)), ...registryIds.filter((providerId) => !current.includes(providerId))];
      const draggedId = draggedProviderRef.current;
      if (!draggedId || draggedId === targetId) return current;
      const next = orderedIds.filter((id) => id !== draggedId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedId);
      draggedProviderRef.current = null;
      return next;
    });
  }

  function chooseLocale(locale: string) {
    const countryCode = countryCodeForLocale(locale);
    setSelectedLocale(locale);
    setLanguage(locale.split("-")[0].toLowerCase());
    localStorage.setItem("royalcommand:ui-locale", locale);
    if (languageSearch.trim() && !languageCountryOrder.includes(locale)) promoteLanguageLocale(locale);
    void saveLocalePreferences({ uiLocale: locale, countryCode, language: locale.split("-")[0].toLowerCase() });
    window.dispatchEvent(new Event("royalcommand:language-change"));
    setLanguageOpen(false);
  }

  async function saveLocalePreferences(preferences: Record<string, unknown>) {
    try {
      await fetch("/api/user/preferences", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
    } catch {}
  }

  function persistLanguageCountryOrder(nextOrder: string[]) {
    setLanguageCountryOrder(nextOrder);
    localStorage.setItem(LANGUAGE_COUNTRY_ORDER_KEY, JSON.stringify(nextOrder));
    void saveLocalePreferences({ languageCountryOrder: nextOrder });
  }

  function promoteLanguageLocale(locale: string) {
    persistLanguageCountryOrder(promoteLanguageCountryLocale(languageCountryOrder, locale));
  }

  function dropLanguageLocale(targetLocale: string, placeAfter: boolean) {
    const draggedLocale = draggedLanguageLocaleRef.current;
    if (!draggedLocale || draggedLocale === targetLocale) return;
    const next = moveLanguageCountryLocale(languageCountryOrder, draggedLocale, targetLocale, placeAfter);
    draggedLanguageLocaleRef.current = null;
    persistLanguageCountryOrder(next);
  }

  function hideCountry(countryCode: string) {
    const next = new Set(hiddenCountries);
    next.add(countryCode);
    setHiddenCountries(next);
    const values = Array.from(next);
    localStorage.setItem(HIDDEN_COUNTRIES_KEY, JSON.stringify(values));
    void saveLocalePreferences({ hiddenCountries: values });
  }

  function restoreCountry(countryCode: string) {
    const next = new Set(hiddenCountries);
    next.delete(countryCode);
    setHiddenCountries(next);
    const values = Array.from(next);
    localStorage.setItem(HIDDEN_COUNTRIES_KEY, JSON.stringify(values));
    void saveLocalePreferences({ hiddenCountries: values });
    const restoredEntry = LOCALE_SEARCH_REGISTRY.find((entry) => countryCodeForLocale(entry.locale) === countryCode);
    if (restoredEntry) promoteLanguageLocale(restoredEntry.locale);
  }

  function cancelAll() {
    executionGeneration.current += 1;
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
    setRooms((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, { ...value, loading: false }])) as Record<ProviderId, RoomState>);
  }

  async function integrate() {
    if (!canIntegrate || integrating || integrationInFlightRef.current) return;
    integrationInFlightRef.current = true;
    setIntegrating(true);
    setIntegrationError("");
    let succeeded = false;
    try {
      const res = await fetch("/api/ai/integrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: uid("integration"), prompt: frozenQuestion, language, frozenResults: frozenList }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || "Integration failed");
      const content = String(data.content || "").trim();
      if (!content) throw new Error("Integration returned no answer");
      setIntegrated(content);
      succeeded = true;
    } catch (error) {
      setIntegrationError(error instanceof Error ? error.message : "Integration failed");
    } finally {
      if (!succeeded) integrationInFlightRef.current = false;
      setIntegrating(false);
    }
  }

  const orderedProviders = useMemo(() => {
    const rank = new Map(providerOrder.map((id, index) => [id, index]));
    return providerRegistry.map((provider, index) => ({ provider, index })).sort((a, b) => {
      const aRank = rank.get(a.provider.id);
      const bRank = rank.get(b.provider.id);
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
      return a.index - b.index;
    }).map(({ provider }) => provider);
  }, [providerOrder, providerRegistry]);

  const filteredProviders = useMemo(() => {
    const query = providerSearch.trim().toLowerCase();
    return orderedProviders.filter((provider) => !query || `${provider.name} ${provider.id}`.toLowerCase().includes(query));
  }, [orderedProviders, providerSearch]);

  const filteredLocales = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    const rank = new Map(languageCountryOrder.map((locale, index) => [locale, index]));
    const entries = query
      ? LOCALE_SEARCH_REGISTRY.filter((entry) => entry.searchText.includes(query))
      : languageCountryOrder.map((locale) => LOCALE_SEARCH_REGISTRY.find((entry) => entry.locale === locale)).filter((entry): entry is (typeof LOCALE_SEARCH_REGISTRY)[number] => Boolean(entry));
    return entries
      .filter((entry) => !hiddenCountries.has(countryCodeForLocale(entry.locale)))
      .sort((a, b) => (rank.get(a.locale) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.locale) ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 80);
  }, [hiddenCountries, languageCountryOrder, languageSearch]);

  const hiddenCountryEntries = useMemo(() => {
    const entries = new Map<string, (typeof LOCALE_SEARCH_REGISTRY)[number]>();
    for (const entry of LOCALE_SEARCH_REGISTRY) {
      const countryCode = countryCodeForLocale(entry.locale);
      if (countryCode && hiddenCountries.has(countryCode) && !entries.has(countryCode)) entries.set(countryCode, entry);
    }
    return Array.from(entries.entries());
  }, [hiddenCountries]);

  const selectedCountryCode = countryCodeForLocale(selectedLocale);
  const sendLabel = SEND_LABELS[selectedLocale.split("-")[0].toLowerCase()] || SEND_LABELS.en;
  const createRoomLocale = CREATE_ROOM_COUNTRIES.find((country) => country.code === selectedCountryCode)?.locale || "en";
  const createRoomLabel = createRoomCopy(createRoomLocale).buttonLabel;
  const hasCurrentChatMessages = useMemo(() => PROVIDERS.some((provider) => rooms[provider.id].history.length > 0), [rooms]);
  const currentChatTitle = useMemo(() => {
    const latest = PROVIDERS.flatMap((provider) => rooms[provider.id].history).filter((item) => item.role === "user").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return latest?.title || (latest ? fallbackTitle(latest.content) : "New chat");
  }, [rooms]);
  const openMeta = PROVIDERS.find((provider) => provider.id === openRoom);

  return (
    <main className={`${styles.root} min-h-[100dvh] bg-[#07101d] text-[#f4f0e7]`}>
      <header className="sticky top-0 z-50 border-b border-[#d7b64d]/25 bg-[#07101d]/95 backdrop-blur">
        <div data-rc-top-controls className="relative flex h-14 items-center gap-2 px-3 sm:px-4">
          <button onClick={() => { setMenuOpen((v) => !v); setChatsOpen(false); setLanguageOpen(false); }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><MessageSquare size={16}/>Chat History</button>
          <button onClick={() => { setChatsOpen((v) => !v); setMenuOpen(false); setLanguageOpen(false); }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><Menu size={16}/>AI Rooms</button>
          <button onClick={() => { setLanguageOpen((v) => !v); setMenuOpen(false); setChatsOpen(false); }} className="flex max-w-44 items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><CountryFlag countryCode={selectedCountryCode}/><span className="truncate">{selectedCountryCode}</span><ChevronDown size={14}/></button>
          <div className="ml-auto text-right"><div className="font-serif text-lg text-[#f1d77a]">Royal Command AI</div><div className="text-[10px] uppercase tracking-[.22em] text-[#8d98a8]">Independent Rooms V1</div></div>

          {menuOpen && <div className="absolute left-3 top-[52px] z-50 flex max-h-[calc(100dvh-72px)] w-80 flex-col overflow-hidden rounded-xl border border-[#d7b64d]/25 bg-[#0b1524] p-2 shadow-2xl"><button type="button" onClick={startNewChat} className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-[#4169e1]/80 bg-[#1e3a8a] px-3 py-2.5 font-semibold text-white shadow-md hover:bg-[#274db3]"><Plus size={16}/>New Chat</button><div className="min-h-0 overflow-y-auto"><div className="sticky top-0 bg-[#0b1524] px-2 py-2 text-xs uppercase tracking-wider text-[#8d98a8]">Chat History</div>{hasCurrentChatMessages ? <div className="mb-1"><div className="flex items-center rounded-lg border border-[#d7b64d]/45 bg-[#17130a]"><button type="button" onClick={() => setMenuOpen(false)} title={currentChatTitle} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm text-[#f0d36a]">{currentChatTitle}</button>{hasCurrentChatMessages ? <><button type="button" onClick={editCurrentChatTitle} className="grid h-9 w-9 shrink-0 place-items-center text-[#f0d36a]" aria-label="Edit current chat title"><Pencil size={13}/></button><button type="button" onClick={() => setDeleteConfirmId("current")} className="grid h-9 w-9 shrink-0 place-items-center text-[#8d98a8] hover:text-red-300" aria-label="Delete current chat"><Trash2 size={13}/></button></> : null}</div>{hasCurrentChatMessages && deleteConfirmId === "current" ? <div className="mt-1 flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-950/25 px-2 py-2 text-xs"><span className="min-w-0 flex-1">Delete this chat?</span><button type="button" onClick={() => setDeleteConfirmId(null)} className="rounded px-2 py-1 text-[#c9d1dc] hover:bg-white/10">Cancel</button><button type="button" onClick={() => deleteChatSession("current")} className="rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30">Delete</button></div> : null}</div> : null}{chatSessions.filter((session) => session.id !== activeChatSessionId).map((session) => <div key={session.id} className="mb-1"><div className="flex items-center rounded-lg border border-white/10 hover:border-[#d7b64d]/35 hover:bg-white/5"><button type="button" onClick={() => loadChatSession(session)} title={session.title} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm">{session.title}</button><button type="button" onClick={() => editSavedChatTitle(session)} className="grid h-9 w-9 shrink-0 place-items-center text-[#8d98a8] hover:text-[#f0d36a]" aria-label={`Edit ${session.title}`}><Pencil size={13}/></button><button type="button" onClick={() => setDeleteConfirmId(session.id)} className="grid h-9 w-9 shrink-0 place-items-center text-[#8d98a8] hover:text-red-300" aria-label={`Delete ${session.title}`}><Trash2 size={13}/></button></div>{deleteConfirmId === session.id ? <div className="mt-1 flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-950/25 px-2 py-2 text-xs"><span className="min-w-0 flex-1">Delete this chat?</span><button type="button" onClick={() => setDeleteConfirmId(null)} className="rounded px-2 py-1 text-[#c9d1dc] hover:bg-white/10">Cancel</button><button type="button" onClick={() => deleteChatSession(session.id)} className="rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30">Delete</button></div> : null}</div>)}</div></div>}

          {chatsOpen && <div className="absolute left-24 top-[52px] z-50 flex max-h-[calc(100dvh-72px)] w-80 flex-col overflow-hidden rounded-xl border border-[#d7b64d]/25 bg-[#0b1524] shadow-2xl"><div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1524] p-3"><div className="mb-2 flex justify-end"><a href={`/room-builder?returnRoom=${encodeURIComponent(roomId)}`} className="inline-flex h-[34px] items-center gap-2 rounded-lg border border-[#d9b44a] bg-[#7A0C2E] px-3 text-xs font-bold text-[#fff4c2] shadow-[0_0_14px_rgba(217,180,74,.4)] transition hover:bg-[#94113a]" title={createRoomLabel}><span aria-hidden="true">＋</span><span>{createRoomLabel}</span></a></div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d98a8]"/><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} autoFocus placeholder="Search AI providers" className="w-full rounded-lg border border-white/15 bg-[#07101d] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#d7b64d]/60"/></div></div><div className="min-h-0 overflow-y-auto p-2" onDragOver={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); const edge = 110; if (event.clientY < bounds.top + edge) event.currentTarget.scrollTop -= 90; else if (event.clientY > bounds.bottom - edge) event.currentTarget.scrollTop += 90; }}>{customerRooms.length ? <div className="mb-2 border-b border-white/10 pb-2"><div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#f0d36a]">Your Rooms</div>{customerRooms.map((room) => <a key={room.id} href={`/rooms/${encodeURIComponent(room.id)}`} className="mb-1 flex min-h-[38px] w-full items-center rounded-lg border border-[#d7b64d]/35 bg-[#14284f] px-3 text-sm font-semibold text-[#f0d36a] transition hover:border-[#d7b64d] hover:bg-[#1b376c]" title={room.name}>{room.name}</a>)}</div> : null}{filteredProviders.map((provider) => { const cardProvider = PROVIDERS.find((item) => item.id === provider.id); const selectable = Boolean(cardProvider && provider.available); const chosen = Boolean(cardProvider && selected.includes(cardProvider.id)); const status = accountConnectedProviders.has(provider.id) ? "Connected" : "Not Connected"; return <div key={provider.id} draggable onDragStart={(event) => { draggedProviderRef.current = provider.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", provider.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); dropProvider(provider.id, event.clientY > bounds.top + bounds.height / 2); }} onDragEnd={() => { draggedProviderRef.current = null; }} className={`mb-1 flex cursor-grab items-center rounded-lg border active:cursor-grabbing ${chosen ? "border-[#d7b64d]/70 bg-[#2a2109]" : "border-white/10 hover:border-white/25"}`}><GripVertical size={15} className="ml-2 shrink-0 text-[#8d98a8]" aria-hidden="true"/><button type="button" disabled={!selectable} onClick={() => chooseProvider(provider.id)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${chosen ? "border-[#d7b64d] bg-[#d7b64d] text-[#07101d]" : "border-white/20"}`}>{chosen ? <Check size={13}/> : null}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{provider.name}</span><span className={`shrink-0 text-[10px] ${status === "Connected" ? "text-emerald-300" : "text-[#8d98a8]"}`}>{status}</span></button></div>; })}</div></div>}

          {languageOpen && <div className="absolute right-3 top-[52px] z-50 flex max-h-[calc(100dvh-72px)] w-96 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-[#d7b64d]/25 bg-[#0b1524] shadow-2xl sm:right-auto sm:left-48"><div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1524] p-3"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d98a8]"/><input value={languageSearch} onChange={(event) => setLanguageSearch(event.target.value)} autoFocus placeholder="Search languages, countries or codes" className="w-full rounded-lg border border-white/15 bg-[#07101d] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#d7b64d]/60"/></div></div><div className="min-h-0 overflow-y-auto p-2" onDragOver={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); const edge = 90; if (event.clientY < bounds.top + edge) event.currentTarget.scrollTop -= 120; else if (event.clientY > bounds.bottom - edge) event.currentTarget.scrollTop += 120; }}>{filteredLocales.length ? filteredLocales.map((entry) => { const countryCode = countryCodeForLocale(entry.locale); return <div key={entry.locale} draggable onDragStart={(event) => { draggedLanguageLocaleRef.current = entry.locale; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", entry.locale); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); dropLanguageLocale(entry.locale, event.clientY > bounds.top + bounds.height / 2); }} onDragEnd={() => { draggedLanguageLocaleRef.current = null; }} className={`mb-1 flex cursor-grab items-center rounded-lg border active:cursor-grabbing ${selectedLocale === entry.locale ? "border-[#d7b64d]/70 bg-[#2a2109]" : "border-white/10 hover:border-white/25"}`}><GripVertical size={15} className="ml-2 shrink-0 text-[#8d98a8]" aria-hidden="true"/><button type="button" onClick={() => chooseLocale(entry.locale)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left"><CountryFlag countryCode={countryCode}/><span className="truncate text-sm">{countryNameForLocale(entry.locale, entry.label)}</span></button><button type="button" onClick={() => hideCountry(countryCode)} className="mr-2 rounded px-2 py-1 text-[10px] text-[#8d98a8] hover:bg-white/10 hover:text-[#f0d36a]">Hide</button></div>; }) : <div className="px-3 py-8 text-center text-sm text-[#8d98a8]">No matching locale</div>}{hiddenCountryEntries.length ? <div className="mt-3 border-t border-white/10 pt-2"><div className="px-2 py-2 text-xs uppercase tracking-wider text-[#8d98a8]">Hidden countries</div>{hiddenCountryEntries.map(([countryCode, entry]) => <div key={countryCode} className="mb-1 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><CountryFlag countryCode={countryCode}/><span className="min-w-0 flex-1 truncate text-sm">{countryNameForLocale(entry.locale, entry.label)}</span><button type="button" onClick={() => restoreCountry(countryCode)} className="rounded border border-[#d7b64d]/30 px-2 py-1 text-xs text-[#f0d36a] hover:bg-[#2a2109]">Restore</button></div>)}</div> : null}</div></div>}
        </div>
      </header>

      <div className="w-full max-w-none p-1.5 sm:p-2">
        {globalError && <div className="mb-3 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">{globalError}</div>}

        {!openRoom ? (
          <>
            <section className="relative mb-3 rounded-xl border border-white/10 bg-[#0b1524] p-2 sm:p-3">
              <form onSubmit={submitSelected} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) addAttachments(event.dataTransfer.files); }} data-rc-composer-enhanced="true" className="relative">
                <textarea value={allPrompt} onChange={(e) => setAllPrompt(e.target.value)} className="min-h-32 w-full resize-y rounded-xl border border-white/10 bg-[#07101d] p-4 pr-48 text-base leading-7 outline-none focus:border-[#d7b64d]/60" placeholder="Ask the selected AI rooms..."/>
                <input id="rca-chat-file-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.rtf,.odt" onChange={(event) => { if (event.target.files) addAttachments(event.target.files); event.currentTarget.value = ""; }} className="sr-only" aria-label="Attach files"/>
                {attachments.length ? <div className="absolute bottom-[72px] left-3 right-52 flex min-w-0 gap-1.5 overflow-x-auto"><span className="shrink-0 rounded-md border border-[#d7b64d]/30 bg-[#0b1524] px-2 py-1 text-xs text-[#f0d36a]">Attached {attachments.length}</span>{attachments.map((file, index) => <span key={`${file.name}-${file.size}-${file.lastModified}`} className="flex min-w-0 max-w-48 shrink-0 items-center gap-1 rounded-md border border-white/15 bg-[#0b1524] px-2 py-1 text-xs text-[#c9d1dc]"><span className="truncate" title={file.name}>{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 text-[#8d98a8] hover:text-white" aria-label={`Remove ${file.name}`}><X size={12}/></button></span>)}</div> : null}
                {helperOpen && <div className="absolute bottom-14 right-3 z-20 w-72 rounded-xl border border-[#d7b64d]/35 bg-[#0b1524] p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><div className="font-semibold text-[#f0d36a]">AI Helper</div><button type="button" onClick={() => setHelperOpen(false)} className="grid h-7 w-7 place-items-center rounded-md border border-white/10"><X size={14}/></button></div><div className="text-sm leading-6 text-[#c9d1dc]">질문을 입력한 뒤 원하는 AI 카드만 선택하세요. 여러 AI를 선택하면 각 AI가 서로 독립적으로 같은 질문을 받습니다.</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => setSelected(PROVIDERS.filter((p) => connected.has(p.id)).map((p) => p.id))} className="rounded-lg border border-white/15 px-2 py-1.5 text-xs hover:bg-white/10">전체 선택</button><button type="button" onClick={() => setSelected([])} className="rounded-lg border border-white/15 px-2 py-1.5 text-xs hover:bg-white/10">선택 해제</button></div></div>}
                <div data-rc-composer-controls="true" className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button type="button" onClick={() => toggleMic("all")} className={`grid h-10 w-10 place-items-center rounded-lg border ${userWantsListening ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/15 bg-[#0b1524] text-[#d8dee8]"}`} title="Microphone"><Mic size={17}/></button>
                  <label htmlFor="rca-chat-file-input" className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-white/15 bg-[#0b1524] text-[#d8dee8]" title="Attach files" aria-label="Attach files"><Paperclip size={17}/></label>
                  <button type="button" onClick={() => setHelperOpen((value) => !value)} className="flex h-10 items-center gap-1 rounded-lg border border-white/15 bg-[#0b1524] px-2.5 text-xs font-semibold text-[#f0d36a]" title="AI Helper"><Sparkles size={15}/>AI Helper</button>
                  <button type="submit" disabled={!selectedConnected.length} aria-label={sendLabel} title={sendLabel} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d7b64d]/50 bg-[#1e3a8a] text-[#f8df7a] disabled:opacity-40"><span>{sendLabel}</span><Send size={17}/></button>
                </div>
              </form>
            </section>

            <section data-rc-multi-ai-grid="true" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {PROVIDERS.map((provider) => {
                const room = rooms[provider.id];
                const available = connected.has(provider.id);
                const active = selected.includes(provider.id) && available;
                const latestQuestionIndex = room.history.map((item) => item.role).lastIndexOf("user");
                const latestQuestion = latestQuestionIndex >= 0 ? room.history[latestQuestionIndex] : undefined;
                const latestAnswer = latestQuestionIndex >= 0 ? room.history.slice(latestQuestionIndex + 1).find((item) => item.role === "assistant") : undefined;
                const expanded = Boolean(expandedAnswers[provider.id]);
                return <article key={provider.id} data-rc-multi-ai-card="true" data-rc-multi-ai-active={active ? "true" : "false"} data-rc-multi-ai-expanded={expanded ? "true" : "false"} style={{ display: active ? "flex" : "none" }} className={`min-h-[360px] flex-col rounded-2xl border px-3 py-4 shadow-lg ${active ? "border-[#d7b64d]/70 bg-[#10223f]" : "border-white/10 bg-[#0b1524]"}`}>
                  <div className="flex min-h-0 flex-1 flex-col">
                      <div className="flex items-center gap-2"><button type="button" onClick={() => toggleSelected(provider.id)} disabled={!available} className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${active ? "border-[#d7b64d] bg-[#d7b64d] text-[#07101d]" : "border-white/25"} disabled:opacity-30`}>{active ? <X size={14}/> : null}</button><button type="button" onClick={() => setOpenRoom(provider.id)} className="shrink-0 rounded-md border border-white/15 bg-[#07101d] px-2 py-1 text-xs font-semibold leading-none hover:border-[#d7b64d]/50">Open</button><div className="ml-1 flex w-36 shrink-0 items-center gap-2"><ProviderBrandLogo provider={provider.id}/><h3 className="min-w-0 truncate text-lg font-semibold leading-none">{provider.name}</h3><span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${available ? "bg-emerald-400" : "bg-slate-600"}`}/></div><textarea rows={1} value={cardPrompts[provider.id]} onChange={(event) => setCardPrompts((current) => ({ ...current, [provider.id]: event.target.value }))} onInput={(event) => autoSizeCardPrompt(event.currentTarget)} onKeyDown={(event) => handleCardPromptKeyDown(event, provider.id)} disabled={!available || room.loading} aria-label={`Ask ${provider.name}`} placeholder={`Ask ${provider.name}...`} className="min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-white/15 bg-[#07101d] px-3 py-2 text-sm leading-5 outline-none focus:border-[#d7b64d]/60 disabled:opacity-40"/></div>
                      {latestQuestion ? <div className="mt-3 truncate border-b border-white/10 pb-2 text-sm font-semibold text-[#f1d77a]" title={latestQuestion.content}>{latestQuestion.title || latestQuestion.content}</div> : null}
                      <div role="button" tabIndex={0} aria-expanded={expanded} onClick={() => latestAnswer && setExpandedAnswers((current) => ({ ...current, [provider.id]: !expanded }))} onKeyDown={(event) => { if (latestAnswer && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setExpandedAnswers((current) => ({ ...current, [provider.id]: !expanded })); } }} className={`mt-2 min-h-0 flex-1 rounded-xl border border-white/10 bg-black/15 p-3 text-[15px] leading-6 ${latestAnswer ? "cursor-pointer" : ""} ${expanded ? "overflow-visible whitespace-pre-wrap" : "overflow-hidden"}`}>
                        {latestAnswer ? <><div className="mb-2 border-b border-white/10 pb-2 text-sm font-semibold text-[#f1d77a]">{latestAnswer.title || fallbackTitle(latestAnswer.content)}</div>{latestAnswer.content}</> : room.loading ? `${provider.name} is working…` : <span className="text-[#c8d0dc]">No answer yet</span>}
                        {expanded && latestAnswer ? <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3"><button type="button" onClick={(event) => { event.stopPropagation(); void navigator.clipboard.writeText(latestAnswer.content); }} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10"><Copy size={13}/>Copy</button><button type="button" onClick={(event) => { event.stopPropagation(); setExpandedAnswers((current) => ({ ...current, [provider.id]: false })); }} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">Collapse</button></div> : null}
                      </div>
                      {room.loading || room.error || !available ? <div className="mt-2 text-[11px] text-[#8e99a8]">{room.loading ? "Working…" : room.error ? "Error" : "Not connected"}</div> : null}
                  </div>
                </article>;
              })}

              <article className="flex min-h-[360px] flex-col rounded-2xl border border-[#7a5b18]/60 bg-[#17130a] p-4 shadow-lg"><div className="flex items-center justify-between"><div><h3 className="text-xl font-semibold text-[#f0d36a]">Final Integrator</h3><p className="text-xs text-[#a59a76]">Read-only · Frozen results only</p></div><span className={`h-2 w-2 rounded-full ${canIntegrate ? "bg-emerald-400" : "bg-slate-600"}`}/></div><div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#7a5b18]/30 bg-black/15 p-3 text-[15px] leading-6 text-[#d6cfb5]">{integrating ? "Creating integrated answer…" : integrated ? integrated : integrationError ? `Integration failed: ${integrationError}` : canIntegrate ? `${frozenList.length} successful result${frozenList.length === 1 ? "" : "s"} ready.` : frozenQuestion && failedFrozenList.length ? "Integration unavailable: no successful AI answers." : "No integrated answer yet"}</div>{failedFrozenList.length ? <div className="mt-2 rounded-lg border border-red-400/25 bg-red-950/20 px-3 py-2 text-xs text-red-200"><div className="font-semibold">Excluded failed AI</div>{failedFrozenList.map((result) => <div key={result.provider}>{result.providerName}: {result.error || "No completed answer"}</div>)}</div> : null}<button disabled={!canIntegrate || integrating} onClick={integrate} className="mt-3 w-full rounded-lg border border-[#d7b64d]/40 bg-[#2a2109] px-3 py-2.5 text-sm font-semibold text-[#f0d36a] disabled:opacity-35">{integrating ? "Integrating…" : integrated ? "Integrated answer created" : "Create integrated answer"}</button></article>
            </section>
          </>
        ) : (
          <section className="mx-auto flex min-h-[calc(100dvh-86px)] max-w-6xl flex-col rounded-2xl border border-white/10 bg-[#0b1524] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 p-3"><button onClick={() => { stopMic(); setOpenRoom(null); }} className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 hover:bg-white/10"><X size={17}/></button><div><h2 className="text-xl font-semibold">{openMeta?.name}</h2><p className="text-xs text-[#8f9baa]">Strict isolated provider room</p></div><span className={`ml-auto h-2.5 w-2.5 rounded-full ${openRoom && connected.has(openRoom) ? "bg-emerald-400" : "bg-slate-600"}`}/></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">{rooms[openRoom].history.length ? rooms[openRoom].history.map((item) => <div key={item.id} className={`max-w-[88%] whitespace-pre-wrap rounded-xl border px-3 py-2 text-[15px] leading-7 ${item.role === "user" ? "ml-auto border-[#d7b64d]/35 bg-[#1e3a8a]" : "mr-auto border-white/10 bg-[#07101d]"}`}>{item.role === "assistant" && item.title ? <div className="mb-1 text-xs font-semibold text-[#f1d77a]">{item.title}</div> : null}{item.content}</div>) : <div className="py-20 text-center text-[#8d99a8]">Start a private conversation with {openMeta?.name}.</div>}{rooms[openRoom].loading && <div className="text-sm text-[#f0d36a]">{openMeta?.name} is working…</div>}{rooms[openRoom].error && <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{rooms[openRoom].error}</div>}</div>
            <form onSubmit={submitSingle} className="border-t border-white/10 p-3"><div className="relative"><textarea ref={roomPromptRef} value={roomPrompt} onChange={(event) => handleRoomPromptChange(event.currentTarget)} onInput={(event) => autoSizeRoomPrompt(event.currentTarget)} onScroll={(event) => handleRoomPromptScroll(event.currentTarget)} className="min-h-28 max-h-[38dvh] w-full resize-none overflow-y-hidden rounded-xl border border-white/10 bg-[#07101d] p-3 pb-14 text-base leading-7 outline-none focus:border-[#d7b64d]/60" placeholder={`Message ${openMeta?.name} only...`}/>{interimTranscript && userWantsListening ? <div className="pointer-events-none absolute bottom-14 left-3 right-14 truncate text-xs text-white/35">{interimTranscript}</div> : null}<div className="absolute bottom-3 left-3 flex items-center gap-2"><button type="button" aria-pressed={userWantsListening} data-recognition-active={recognitionActive ? "true" : "false"} data-manual-stop={manualStop ? "true" : "false"} onClick={() => toggleMic("room")} className={`grid h-10 w-10 place-items-center rounded-lg border ${userWantsListening ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/15 bg-[#0b1524]"}`}><Mic size={17}/></button><div aria-hidden="true" className="flex h-8 items-center gap-1"><span className={`h-2 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "0ms", animationDuration: "650ms" } : undefined}/><span className={`h-4 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "90ms", animationDuration: "650ms" } : undefined}/><span className={`h-6 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "180ms", animationDuration: "650ms" } : undefined}/><span className={`h-3 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "270ms", animationDuration: "650ms" } : undefined}/><span className={`h-5 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "360ms", animationDuration: "650ms" } : undefined}/><span className={`h-2 w-0.5 rounded-full ${userWantsListening ? "animate-pulse bg-[#f0d36a]" : "bg-white/20"}`} style={userWantsListening ? { animationDelay: "450ms", animationDuration: "650ms" } : undefined}/></div></div><button disabled={!openRoom || !connected.has(openRoom) || rooms[openRoom].loading} className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-lg border border-[#d7b64d]/50 bg-[#1e3a8a] text-[#f8df7a] disabled:opacity-35"><Send size={17}/></button></div></form>
          </section>
        )}
      </div>
    </main>
  );
}
