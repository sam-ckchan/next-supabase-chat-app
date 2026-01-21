"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage, editMessage, deleteMessage } from "@/services/messages";
import { createClient } from "@/lib/supabase/client";
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

      // Get current user for optimistic message
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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
          user_id: user.id,
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
    onSuccess: (newMessage, _vars, context) => {
      if (!channelId || !context?.optimisticId) return;

      // Replace optimistic message with real one by optimisticId
      queryClient.setQueryData<{
        pages: { messages: OptimisticMessage[]; nextCursor: string | null }[];
        pageParams: (string | undefined)[];
      }>(["messages", channelId], (oldData) => {
        if (!oldData) return oldData;

        // Check if optimistic message still exists
        const hasOptimistic = oldData.pages.some((page) =>
          page.messages.some((m) => m.id === context.optimisticId)
        );

        if (!hasOptimistic) {
          // Already replaced by realtime, check if real message exists
          const hasReal = oldData.pages.some((page) =>
            page.messages.some((m) => m.id === newMessage.id)
          );
          if (hasReal) return oldData; // Already handled

          // Realtime beat us but with different message, add it
          return {
            ...oldData,
            pages: oldData.pages.map((page, idx) =>
              idx === 0 ? { ...page, messages: [newMessage, ...page.messages] } : page
            ),
          };
        }

        // Replace optimistic with real message
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => (m.id === context.optimisticId ? newMessage : m)),
          })),
        };
      });
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
