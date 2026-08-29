"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import RoomV3 from "./RoomV3";
import CustomerProfileHub from "./CustomerProfileHub";
import TopRoomFinderOverlay from "./TopRoomFinderOverlay";
import RoomSiteLinks from "./RoomSiteLinks";
import SavedConversationInspector from "./SavedConversationInspector";
import FirstRoomWelcome from "./FirstRoomWelcome";
import AIHelperChat from "./AIHelperChat";
import LiveAvatarLayer from "./LiveAvatarLayer";
import AIHelperVoiceBridge from "./AIHelperVoiceBridge";
import MainChatMicBridge from "./MainChatMicBridge";
import IntegratedAnswerInlineStatus from "./IntegratedAnswerInlineStatus";
import LegalRoomStarter from "./LegalRoomStarter";
import LegalHelperOpenBridge from "./LegalHelperOpenBridge";
import LegalCasePackage from "./LegalCasePackage";
import AISelectionPersistenceBridge from "./AISelectionPersistenceBridge";

type Conversation = {
  id: string;
  status: "active" | "archived";
};

function activeKey(roomId: string) {
  return `royalcommand:room:${roomId}:active-conversation`;
}

function preloadKey(roomId: string) {
  return `royalcommand:room:${roomId}:preloaded-conversation`;
}

export default function StableRoomV3() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [version, setVersion] = useState(0);
  const visibleConversationIdsRef = useRef<string[]>([]);
  const conversationCacheRef = useRef(new Map<string, unknown[]>());
  const pendingConversationRef = useRef(new Map<string, Promise<unknown[]>>());

  useEffect(() => {
    if (!roomId) return;

    let changing = false;

    const remountCenterOnly = () => {
      const doc = document as Document & {
        startViewTransition?: (callback: () => void) => { finished?: Promise<unknown> };
      };
      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => setVersion((value) => value + 1));
      } else {
        setVersion((value) => value + 1);
      }
    };

    const cacheConversation = (conversationId: string, messages: unknown[]) => {
      conversationCacheRef.current.set(conversationId, messages);
      try {
        window.sessionStorage.setItem(
          preloadKey(roomId),
          JSON.stringify({ conversationId, messages }),
        );
      } catch {}
    };

    const loadConversationMessages = (conversationId: string) => {
      const cached = conversationCacheRef.current.get(conversationId);
      if (cached) return Promise.resolve(cached);

      const pending = pendingConversationRef.current.get(conversationId);
      if (pending) return pending;

      const request = fetch(`/api/rooms/${roomId}/conversations/${conversationId}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Conversation load failed");
          const payload = await response.json().catch(() => ({}));
          const messages = Array.isArray(payload?.messages) ? payload.messages : [];
          conversationCacheRef.current.set(conversationId, messages);
          return messages as unknown[];
        })
        .finally(() => pendingConversationRef.current.delete(conversationId));

      pendingConversationRef.current.set(conversationId, request);
      return request;
    };

    const syncActiveRow = () => {
      const activeId = window.sessionStorage.getItem(activeKey(roomId)) || "";
      void fetch(`/api/rooms/${roomId}/conversations`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const visible = Array.isArray(payload?.conversations)
            ? (payload.conversations as Conversation[]).filter((item) => item.status !== "archived")
            : [];
          visibleConversationIdsRef.current = visible.map((item) => item.id);
          const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]'));
          buttons.forEach((button, index) => {
            const row = button.parentElement;
            if (!(row instanceof HTMLElement)) return;
            const active = visible[index]?.id === activeId;
            row.style.borderColor = active ? "#FFD700" : "";
            row.style.backgroundColor = active ? "rgba(255,215,0,.15)" : "";
          });
        })
        .catch(() => {});
    };

    const conversationIdForButton = async (historyButton: HTMLButtonElement) => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]'));
      const index = buttons.indexOf(historyButton);
      if (index < 0) throw new Error("Conversation row not found");

      const cachedId = visibleConversationIdsRef.current[index];
      if (cachedId) return cachedId;

      const listResponse = await fetch(`/api/rooms/${roomId}/conversations`, { cache: "no-store" });
      const listPayload = await listResponse.json().catch(() => ({}));
      const visible = Array.isArray(listPayload?.conversations)
        ? (listPayload.conversations as Conversation[]).filter((item) => item.status !== "archived")
        : [];
      visibleConversationIdsRef.current = visible.map((item) => item.id);
      const conversationId = visible[index]?.id;
      if (!conversationId) throw new Error("Conversation not found");
      return conversationId;
    };

    const onPointerOverCapture = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || changing) return;
      const historyButton = target.closest<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]');
      if (!historyButton) return;

      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]'));
      const index = buttons.indexOf(historyButton);
      const conversationId = index >= 0 ? visibleConversationIdsRef.current[index] : "";
      if (!conversationId || conversationCacheRef.current.has(conversationId) || pendingConversationRef.current.has(conversationId)) return;
      void loadConversationMessages(conversationId).catch(() => {});
    };

    const onClickCapture = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || changing) return;

      const newChat = target.closest<HTMLButtonElement>("#rc-new-chat-button");
      const historyButton = target.closest<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]');
      if (!newChat && !historyButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      changing = true;

      try {
        if (newChat) {
          const response = await fetch(`/api/rooms/${roomId}/conversations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Chat" }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.conversation?.id) throw new Error("New Chat failed");
          window.sessionStorage.setItem(activeKey(roomId), payload.conversation.id);
          cacheConversation(payload.conversation.id, []);
          remountCenterOnly();
          window.setTimeout(syncActiveRow, 80);
          return;
        }

        const conversationId = await conversationIdForButton(historyButton!);
        const messages = await loadConversationMessages(conversationId);

        window.sessionStorage.setItem(activeKey(roomId), conversationId);
        cacheConversation(conversationId, messages);
        remountCenterOnly();
        window.setTimeout(syncActiveRow, 80);
      } catch {
        // Keep the current Room mounted if a server conversation change fails.
      } finally {
        changing = false;
      }
    };

    document.addEventListener("pointerover", onPointerOverCapture, true);
    document.addEventListener("click", onClickCapture, true);
    window.setTimeout(syncActiveRow, 120);
    return () => {
      document.removeEventListener("pointerover", onPointerOverCapture, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [roomId]);

  return (
    <>
      <FirstRoomWelcome />
      <TopRoomFinderOverlay />
      <CustomerProfileHub />
      <RoomSiteLinks />
      <SavedConversationInspector />
      <AIHelperChat />
      <LegalHelperOpenBridge />
      <AIHelperVoiceBridge />
      <MainChatMicBridge />
      <LiveAvatarLayer />
      <IntegratedAnswerInlineStatus />
      <LegalRoomStarter />
      <LegalCasePackage />
      <AISelectionPersistenceBridge />
      <RoomV3 key={`${roomId}:${version}`} />
    </>
  );
}
