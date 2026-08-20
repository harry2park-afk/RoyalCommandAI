"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomV3 from "./RoomV3";

type Conversation = {
  id: string;
  status: "active" | "archived";
};

function activeKey(roomId: string) {
  return `royalcommand:room:${roomId}:active-conversation`;
}

export default function StableRoomV3() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    let changing = false;

    const remountCenterOnly = () => {
      setVersion((value) => value + 1);
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
          remountCenterOnly();
          window.setTimeout(syncActiveRow, 850);
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

        await fetch(`/api/rooms/${roomId}/conversations/${conversation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        window.sessionStorage.setItem(activeKey(roomId), conversation.id);
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

  return <RoomV3 key={`${roomId}:${version}`} />;
}
