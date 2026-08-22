"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomV3 from "./RoomV3";
import CustomerProfileHub from "./CustomerProfileHub";
import TopRoomFinderOverlay from "./TopRoomFinderOverlay";
import RoomSiteLinks from "./RoomSiteLinks";
import SavedConversationInspector from "./SavedConversationInspector";
import FirstRoomWelcome from "./FirstRoomWelcome";
import AIHelperChat from "./AIHelperChat";
import LiveAvatarLayer from "./LiveAvatarLayer";

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
      try {
        window.sessionStorage.setItem(
          preloadKey(roomId),
          JSON.stringify({ conversationId, messages }),
        );
      } catch {}
    };

    const syncActiveRow = () => {
      const activeId = window.sessionStorage.getItem(activeKey(roomId)) || "";
      void fetch(`/api/rooms/${roomId}/conversations`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const visible = Array.isArray(payload?.conversations)
            ? (payload.conversations as Conversation[]).filter((item) => item.status !== "archived")
            : [];
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

        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="Click: open full conversation · Double-click: edit title"]'));
        const index = buttons.indexOf(historyButton!);
        if (index < 0) throw new Error("Conversation row not found");

        const listResponse = await fetch(`/api/rooms/${roomId}/conversations`, { cache: "no-store" });
        const listPayload = await listResponse.json().catch(() => ({}));
        const visible = Array.isArray(listPayload?.conversations)
          ? (listPayload.conversations as Conversation[]).filter((item) => item.status !== "archived")
          : [];
        const conversation = visible[index];
        if (!conversation?.id) throw new Error("Conversation not found");

        const [patchResponse, conversationResponse] = await Promise.all([
          fetch(`/api/rooms/${roomId}/conversations/${conversation.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          }),
          fetch(`/api/rooms/${roomId}/conversations/${conversation.id}`, { cache: "no-store" }),
        ]);
        if (!patchResponse.ok || !conversationResponse.ok) throw new Error("Conversation load failed");
        const conversationPayload = await conversationResponse.json().catch(() => ({}));
        const messages = Array.isArray(conversationPayload?.messages) ? conversationPayload.messages : [];

        window.sessionStorage.setItem(activeKey(roomId), conversation.id);
        cacheConversation(conversation.id, messages);
        remountCenterOnly();
        window.setTimeout(syncActiveRow, 80);
      } catch {
        // Keep the current Room mounted if a server conversation change fails.
      } finally {
        changing = false;
      }
    };

    document.addEventListener("click", onClickCapture, true);
    window.setTimeout(syncActiveRow, 120);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [roomId]);

  return (
    <>
      <FirstRoomWelcome />
      <TopRoomFinderOverlay />
      <CustomerProfileHub />
      <RoomSiteLinks />
      <SavedConversationInspector />
      <AIHelperChat />
      <LiveAvatarLayer />
      <RoomV3 key={`${roomId}:${version}`} />
    </>
  );
}
