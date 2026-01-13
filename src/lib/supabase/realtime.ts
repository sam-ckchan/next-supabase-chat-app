import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export interface RealtimeEventHandlers {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (oldMessage: { id: string }) => void;
}

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export function subscribeToMessages(
  channelId: string,
  handlers: RealtimeEventHandlers
): RealtimeSubscription {
  const supabase = createClient();

  const channel = supabase
    .channel(`messages:${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        if (payload.new && handlers.onInsert) {
          handlers.onInsert(payload.new as Message);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        if (payload.new && handlers.onUpdate) {
          handlers.onUpdate(payload.new as Message);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        if (payload.old && handlers.onDelete) {
          handlers.onDelete({ id: (payload.old as { id: string }).id });
        }
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
