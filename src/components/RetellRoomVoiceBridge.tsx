"use client";

import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { createRetellWebSession } from "@/lib/client/voiceApi";

type RetellAgent = {
  agentId: string;
  name?: string | null;
  language?: string | null;
  published?: boolean | null;
};

type AgentResponse = {
  ok?: boolean;
  agents?: RetellAgent[];
};

function isRoomPage() {
  return typeof window !== "undefined" && /^\/rooms\/[^/]+\/?$/.test(window.location.pathname);
}

function buttonLooksLikeLegacyVoice(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest("button") : null;
  if (!element) return null;
  const text = (element.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  return text.includes("speak to royal command") ? element : null;
}

function currentLanguage() {
  const select = document.querySelector('select[aria-label="Language"]') as HTMLSelectElement | null;
  return select?.value || "ko";
}

function chooseAgent(agents: RetellAgent[]) {
  const usable = agents.filter((agent) => agent.agentId && agent.published !== false);
  const byName = (name: string) => usable.find((agent) => (agent.name || "").toLowerCase().includes(name));
  return byName("katie") || byName("kevin") || usable[0] || agents[0];
}

export default function RetellRoomVoiceBridge() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;

    const onStarted = () => {
      busyRef.current = false;
      setStatus("connected");
      setMessage("Retell 실시간 음성 연결됨");
    };
    const onEnded = () => {
      busyRef.current = false;
      setStatus("idle");
      setMessage("Retell 음성 통화 종료");
    };
    const onError = (value: unknown) => {
      busyRef.current = false;
      setStatus("error");
      setMessage(typeof value === "string" ? value : "Retell 음성 연결 오류");
      try { client.stopCall(); } catch {}
    };

    client.on("call_started", onStarted);
    client.on("call_ended", onEnded);
    client.on("error", onError);

    async function startRetell() {
      if (busyRef.current) return;
      busyRef.current = true;
      setStatus("connecting");
      setMessage("Retell 연결 중…");

      try {
        const response = await fetch("/api/control/retell/agents", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as AgentResponse;
        if (!response.ok || !data.ok || !Array.isArray(data.agents) || data.agents.length === 0) {
          throw new Error("Retell Agent를 찾을 수 없습니다.");
        }

        const agent = chooseAgent(data.agents);
        if (!agent?.agentId) throw new Error("사용 가능한 Retell Agent가 없습니다.");

        const language = currentLanguage();
        const session = await createRetellWebSession(agent.agentId, {
          metadata: {
            source: "royal-command-room",
            room_path: window.location.pathname,
            assistant_name: agent.name || "Royal Command",
          },
          dynamicVariables: {
            royal_command_language: language,
            royal_command_channel: "room_voice",
          },
        });

        setMessage(`${agent.name || "Royal Command"} 마이크 연결 중…`);
        await client.startCall({ accessToken: session.data.accessToken });
      } catch (error) {
        busyRef.current = false;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Retell 음성 연결 실패");
      }
    }

    function onDocumentClick(event: MouseEvent) {
      if (!isRoomPage()) return;
      const button = buttonLooksLikeLegacyVoice(event.target);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (status === "connected") {
        client.stopCall();
        return;
      }

      void startRetell();
    }

    document.addEventListener("click", onDocumentClick, true);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      client.off("call_started", onStarted);
      client.off("call_ended", onEnded);
      client.off("error", onError);
      try { client.stopCall(); } catch {}
      clientRef.current = null;
    };
  }, [status]);

  if (!isRoomPage() || status === "idle") return null;

  return (
    <div className={`fixed bottom-4 left-1/2 z-[1000000] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm shadow-2xl backdrop-blur ${status === "error" ? "border-red-400/40 bg-red-950/90 text-red-100" : "border-[var(--gold)]/50 bg-[#050a12]/95 text-[var(--gold-soft)]"}`}>
      {message}
    </div>
  );
}
