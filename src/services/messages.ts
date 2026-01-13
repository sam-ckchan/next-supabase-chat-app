import { createClient } from "@/lib/supabase/client";
import { MessageBodySchema } from "@/lib/schemas/message";
import type { Database } from "@/types/database";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export interface FetchMessagesParams {
  channelId: string;
  cursor?: string;
  limit?: number;
}

export interface FetchMessagesResult {
  messages: Message[];
  nextCursor: string | null;
}

export async function fetchMessages({
  channelId,
  cursor,
  limit = 50,
}: FetchMessagesParams): Promise<FetchMessagesResult> {
  const supabase = createClient();

  let query = supabase
    .from("messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const messages = data || [];
  const nextCursor = messages.length === limit ? messages[messages.length - 1].created_at : null;

  return { messages, nextCursor };
}

export async function sendMessage(channelId: string, body: string): Promise<Message> {
  const supabase = createClient();

  // Validate body
  const validatedBody = MessageBodySchema.parse(body);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      user_id: user.id,
      body: validatedBody,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function editMessage(messageId: string, body: string): Promise<Message> {
  const supabase = createClient();

  // Validate body
  const validatedBody = MessageBodySchema.parse(body);

  const { data, error } = await supabase
    .from("messages")
    .update({ body: validatedBody })
    .eq("id", messageId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("messages").delete().eq("id", messageId);

  if (error) {
    throw error;
  }
}
