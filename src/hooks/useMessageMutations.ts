"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage, editMessage, deleteMessage } from "@/services/messages";
import type { Database } from "@/types/database";
import type { OptimisticMessage } from "@/lib/schemas/message";

type Message = Database["public"]["Tables"]["messages"]["Row"];

interface SendMessageContext {
  previousData:
    | {
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }
    | undefined;
  optimisticId: string;
}

export function useSendMessage(channelId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body }: { body: string }) => {
      if (!channelId) throw new Error("No channel selected");
      return sendMessage(channelId, body);
    },
    onMutate: async ({ body }) => {
      if (!channelId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId]);

      // Generate optimistic ID
      const optimisticId = crypto.randomUUID();

      // Optimistically add the new message
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (old) => {
        if (!old) return old;

        const optimisticMessage: OptimisticMessage = {
          id: optimisticId,
          channel_id: channelId,
          user_id: "", // Will be set by server
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _optimistic: true,
        };

        return {
          ...old,
          pages: old.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                messages: [optimisticMessage, ...page.messages],
              };
            }
            return page;
          }),
        };
      });

      return { previousData, optimisticId } as SendMessageContext;
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData && channelId) {
        queryClient.setQueryData(["messages", channelId], context.previousData);
      }
    },
    onSettled: () => {
      // Realtime handles the final state via dedupe
    },
  });
}

interface EditMessageContext {
  previousData:
    | {
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }
    | undefined;
}

export function useEditMessage(channelId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      editMessage(messageId, body),
    onMutate: async ({ messageId, body }) => {
      if (!channelId) return;

      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });

      const previousData = queryClient.getQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId]);

      // Optimistically update the message
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    body,
                    updated_at: new Date().toISOString(),
                    _optimistic: true,
                  }
                : m
            ),
          })),
        };
      });

      return { previousData } as EditMessageContext;
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData && channelId) {
        queryClient.setQueryData(["messages", channelId], context.previousData);
      }
    },
  });
}

interface DeleteMessageContext {
  previousData:
    | {
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }
    | undefined;
}

export function useDeleteMessage(channelId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: { messageId: string }) => deleteMessage(messageId),
    onMutate: async ({ messageId }) => {
      if (!channelId) return;

      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });

      const previousData = queryClient.getQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId]);

      // Optimistically remove the message
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.id !== messageId),
          })),
        };
      });

      return { previousData } as DeleteMessageContext;
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData && channelId) {
        queryClient.setQueryData(["messages", channelId], context.previousData);
      }
    },
  });
}
