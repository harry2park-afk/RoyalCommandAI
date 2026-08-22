import { randomUUID } from "crypto";

export type LocalMessage = {
  id: string;
  roomId: string;
  authorType: "user" | "ai" | "system";
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type LocalRoom = {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
};

export type LocalUser = {
  id: string;
  email: string;
  fullName: string;
  defaultLanguage: string;
  password: string;
};

type Store = {
  users: LocalUser[];
  sessions: Record<string, string>;
  rooms: LocalRoom[];
  messages: LocalMessage[];
  documents: Array<{
    id: string;
    roomId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64?: string;
    createdAt: string;
  }>;
};

const globalForStore = globalThis as unknown as { __rcStore?: Store };

function store(): Store {
  if (!globalForStore.__rcStore) {
    globalForStore.__rcStore = {
      users: [
        {
          id: "demo-user-1",
          email: "owner@royalcommand.ai",
          fullName: "Household Owner",
          defaultLanguage: "en",
          password: "password123",
        },
      ],
      sessions: {},
      rooms: [
        {
          id: "demo-room-1",
          name: "Command Room",
          description: "Your first neutral Royal Household Room",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
      messages: [],
      documents: [],
    };
  }
  return globalForStore.__rcStore;
}

export const localDb = {
  getStore: store,
  createSession(userId: string) {
    const token = randomUUID();
    store().sessions[token] = userId;
    return token;
  },
  userFromToken(token?: string | null) {
    if (!token) return null;
    const userId = store().sessions[token];
    return store().users.find((u) => u.id === userId) || null;
  },
  findUserByEmail(email: string) {
    return store().users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  },
  createUser(input: Omit<LocalUser, "id">) {
    const user: LocalUser = { ...input, id: randomUUID() };
    store().users.push(user);
    return user;
  },
  listRooms() {
    return store().rooms;
  },
  createRoom(name: string, description?: string) {
    const room: LocalRoom = {
      id: randomUUID(),
      name,
      description,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    store().rooms.unshift(room);
    return room;
  },
  getRoom(id: string) {
    return store().rooms.find((r) => r.id === id);
  },
  renameRoom(id: string, name: string) {
    const room = store().rooms.find((r) => r.id === id);
    if (!room) return null;
    room.name = name;
    return room;
  },
  updateRoomDescription(id: string, description: string) {
    const room = store().rooms.find((r) => r.id === id);
    if (!room) return null;
    room.description = description;
    return room;
  },
  deleteRoom(id: string) {
    const before = store().rooms.length;
    store().rooms = store().rooms.filter((r) => r.id !== id);
    store().messages = store().messages.filter((m) => m.roomId !== id);
    store().documents = store().documents.filter((d) => d.roomId !== id);
    return store().rooms.length < before;
  },
  listMessages(roomId: string) {
    return store().messages.filter((m) => m.roomId === roomId);
  },
  deleteMessages(roomId: string, ids: string[]) {
    const idSet = new Set(ids);
    const before = store().messages.length;
    store().messages = store().messages.filter(
      (m) => m.roomId !== roomId || !idSet.has(m.id),
    );
    return before - store().messages.length;
  },
  addMessage(msg: Omit<LocalMessage, "id" | "createdAt">) {
    const full: LocalMessage = {
      ...msg,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    store().messages.push(full);
    return full;
  },
  addDocument(doc: {
    roomId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64?: string;
  }) {
    const full = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...doc,
    };
    store().documents.push(full);
    return full;
  },
  listDocuments(roomId: string) {
    return store().documents.filter((d) => d.roomId === roomId);
  },
};
