"use client";

import { useLayoutEffect } from "react";
import { useParams } from "next/navigation";

function sessionKey(roomId: string) {
  return `royalcommand:room:${roomId}:active-conversation`;
}

export default function ServerConversationBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  useLayoutEffect(() => {
    if (!roomId) return;

    const nativeFetch = window.fetch.bind(window);
    const key = sessionKey(roomId);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const roomPath = `/api/rooms/${roomId}`;

      if (method === "GET" && rawUrl === roomPath) {
        const roomResponse = await nativeFetch(input, init);
        if (!roomResponse.ok) return roomResponse;

        const roomPayload = await roomResponse.clone().json().catch(() => null);
        if (!roomPayload || typeof roomPayload !== "object") return roomResponse;

        const activeConversationId = window.sessionStorage.getItem(key);
        if (!activeConversationId) {
          return new Response(JSON.stringify({ ...roomPayload, messages: [] }), {
            status: roomResponse.status,
            statusText: roomResponse.statusText,
            headers: { "Content-Type": "application/json" },
          });
        }

        const conversationResponse = await nativeFetch(
          `${roomPath}/conversations/${encodeURIComponent(activeConversationId)}`,
          { cache: "no-store" },
        );

        if (!conversationResponse.ok) {
          window.sessionStorage.removeItem(key);
          return new Response(JSON.stringify({ ...roomPayload, messages: [] }), {
            status: roomResponse.status,
            statusText: roomResponse.statusText,
            headers: { "Content-Type": "application/json" },
          });
        }

        const conversationPayload = await conversationResponse.json().catch(() => ({}));
        const messages = Array.isArray(conversationPayload?.messages) ? conversationPayload.messages : [];
        return new Response(JSON.stringify({ ...roomPayload, messages }), {
          status: roomResponse.status,
          statusText: roomResponse.statusText,
          headers: { "Content-Type": "application/json" },
        });
      }

      return nativeFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = nativeFetch;
    };
  }, [roomId]);

  return null;
}
