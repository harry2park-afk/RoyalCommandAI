type SupabaseLike = any;

type ConversationRecord = {
  id: string;
  room_id: string;
  created_by: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "New Chat";
  return compact.slice(0, 80);
}

export async function resolveConversation(
  supabase: SupabaseLike,
  roomId: string,
  userId: string,
  requestedConversationId?: string,
  firstPrompt?: string,
): Promise<ConversationRecord> {
  if (requestedConversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", requestedConversationId)
      .eq("room_id", roomId)
      .eq("created_by", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Conversation not found");
    return data as ConversationRecord;
  }

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .eq("room_id", roomId)
    .eq("created_by", userId)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as ConversationRecord;

  const now = new Date().toISOString();
  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      room_id: roomId,
      created_by: userId,
      title: titleFromPrompt(firstPrompt || ""),
      status: "active",
      updated_at: now,
      last_message_at: now,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to create conversation");
  }

  return created as ConversationRecord;
}

export async function touchConversation(
  supabase: SupabaseLike,
  conversationId: string,
  firstPrompt?: string,
) {
  const now = new Date().toISOString();
  const update: Record<string, string> = {
    updated_at: now,
    last_message_at: now,
  };

  const { data: current } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", conversationId)
    .maybeSingle();

  if (current?.title === "New Chat" && firstPrompt) {
    update.title = titleFromPrompt(firstPrompt);
  }

  const { error } = await supabase
    .from("conversations")
    .update(update)
    .eq("id", conversationId);

  if (error) throw new Error(error.message);
}
