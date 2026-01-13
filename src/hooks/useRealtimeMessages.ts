"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeToMessages } from "@/lib/supabase/realtime";
import type { Database } from "@/types/database";
import type { OptimisticMessage } from "@/lib/schemas/message";

type Message = Database["public"]["Tables"]["messages"]["Row"];

interface RealtimeMessagesOptions {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (id: string) => void;
}

interface ConnectionStatus {
  connected: boolean;
}

export function useRealtimeMessages(
  channelId: string | null,
  options: RealtimeMessagesOptions = {}
) {
  const queryClient = useQueryClient();
  const connectionStatusRef = useRef<ConnectionStatus>({ connected: true });

  // INSERT handler with dedupe
  const handleInsert = useCallback(
    (newMessage: Message) => {
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (oldData) => {
        if (!oldData) return oldData;

        // Check for duplicates (by ID or matching optimistic message)
        const allMessages = oldData.pages.flatMap((p) => p.messages);
        const existingIndex = allMessages.findIndex(
          (m) =>
            m.id === newMessage.id ||
            (m._optimistic && m.user_id === newMessage.user_id && m.body === newMessage.body)
        );

        if (existingIndex !== -1 && !allMessages[existingIndex]._optimistic) {
          // Already exists and is not optimistic - skip
          return oldData;
        }

        // Build new pages with the message inserted/replaced
        const newPages = oldData.pages.map((page, pageIndex) => {
          if (pageIndex === 0) {
            // First page - add new message at the beginning
            const filtered = page.messages.filter(
              (m) =>
                m.id !== newMessage.id &&
                !(m._optimistic && m.user_id === newMessage.user_id && m.body === newMessage.body)
            );
            return {
              ...page,
              messages: [newMessage, ...filtered],
            };
          }
          return page;
        });

        return {
          ...oldData,
          pages: newPages,
        };
      });

      options.onInsert?.(newMessage);
    },
    [channelId, queryClient, options]
  );

  // UPDATE handler with staleness check
  const handleUpdate = useCallback(
    (updatedMessage: Message) => {
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (oldData) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) => {
            if (m.id === updatedMessage.id) {
              // Only update if newer
              if (new Date(updatedMessage.updated_at) > new Date(m.updated_at)) {
                return updatedMessage;
              }
            }
            return m;
          }),
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });

      options.onUpdate?.(updatedMessage);
    },
    [channelId, queryClient, options]
  );

  // DELETE handler
  const handleDelete = useCallback(
    (deletedMessage: { id: string }) => {
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (oldData) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((m) => m.id !== deletedMessage.id),
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });

      options.onDelete?.(deletedMessage.id);
    },
    [channelId, queryClient, options]
  );

  // Reconnect reconciliation
  const handleReconnect = useCallback(async () => {
    connectionStatusRef.current.connected = true;
    // Constitution III: DB is source of truth - refetch on reconnect
    await queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
  }, [channelId, queryClient]);

  useEffect(() => {
    if (!channelId) return;

    // Constitution VII: Teardown first pattern
    const subscription = subscribeToMessages(channelId, {
      onInsert: handleInsert,
      onUpdate: handleUpdate,
      onDelete: handleDelete,
    });

    return () => {
      // Cleanup before new subscription
      subscription.unsubscribe();
    };
  }, [channelId, handleInsert, handleUpdate, handleDelete]);

  return {
    isConnected: connectionStatusRef.current.connected,
    reconnect: handleReconnect,
  };
}
