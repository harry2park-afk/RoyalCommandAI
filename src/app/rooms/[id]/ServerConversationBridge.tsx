"use client";

import { useLayoutEffect } from "react";
import { useParams } from "next/navigation";

function sessionKey(roomId: string) {
  return `royalcommand:room:${roomId}:active-conversation`;
}

function preloadKey(roomId: string) {
  return `royalcommand:room:${roomId}:preloaded-conversation`;
}

export default function ServerConversationBridge() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  useLayoutEffect(() => {
    if (!roomId) return;

    const nativeFetch = window.fetch.bind(window);
    const key = sessionKey(roomId);
    const preload = preloadKey(roomId);
    let roomPayloadCache: Record<string, unknown> | null = null;

    const buildRoomResponse = (roomPayload: Record<string, unknown>, messages: unknown[], status = 200, statusText = "OK") =>
      new Response(JSON.stringify({ ...roomPayload, messages }), {
        status,
        statusText,
        headers: { "Content-Type": "application/json" },
      });

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const roomPath = `/api/rooms/${roomId}`;

      if (method === "GET" && rawUrl === roomPath) {
        const activeConversationId = window.sessionStorage.getItem(key);

        if (activeConversationId && roomPayloadCache) {
          try {
            const cached = JSON.parse(window.sessionStorage.getItem(preload) || "null");
            if (cached?.conversationId === activeConversationId && Array.isArray(cached?.messages)) {
              window.sessionStorage.removeItem(preload);
              return buildRoomResponse(roomPayloadCache, cached.messages);
            }
          } catch {
            window.sessionStorage.removeItem(preload);
          }
        }

        const roomResponse = await nativeFetch(input, init);
        if (!roomResponse.ok) return roomResponse;

        const roomPayload = await roomResponse.clone().json().catch(() => null);
        if (!roomPayload || typeof roomPayload !== "object") return roomResponse;
        roomPayloadCache = roomPayload as Record<string, unknown>;

        if (!activeConversationId) {
          return buildRoomResponse(roomPayloadCache, [], roomResponse.status, roomResponse.statusText);
        }

        try {
          const cached = JSON.parse(window.sessionStorage.getItem(preload) || "null");
          if (cached?.conversationId === activeConversationId && Array.isArray(cached?.messages)) {
            window.sessionStorage.removeItem(preload);
            return buildRoomResponse(roomPayloadCache, cached.messages, roomResponse.status, roomResponse.statusText);
          }
        } catch {
          window.sessionStorage.removeItem(preload);
        }

        const conversationResponse = await nativeFetch(
          `${roomPath}/conversations/${encodeURIComponent(activeConversationId)}`,
          { cache: "no-store" },
        );

        if (!conversationResponse.ok) {
          window.sessionStorage.removeItem(key);
          return buildRoomResponse(roomPayloadCache, [], roomResponse.status, roomResponse.statusText);
        }

        const conversationPayload = await conversationResponse.json().catch(() => ({}));
        const messages = Array.isArray(conversationPayload?.messages) ? conversationPayload.messages : [];
        return buildRoomResponse(roomPayloadCache, messages, roomResponse.status, roomResponse.statusText);
      }

      return nativeFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = nativeFetch;
    };
  }, [roomId]);

  return null;
}
