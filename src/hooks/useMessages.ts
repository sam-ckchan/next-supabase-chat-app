"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessages } from "@/services/messages";
import type { Database } from "@/types/database";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: ["messages", channelId],
    queryFn: async ({ pageParam }) => {
      if (!channelId) {
        return { messages: [], nextCursor: null };
      }
      return fetchMessages({
        channelId,
        cursor: pageParam,
        limit: 50,
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!channelId,
  });
}

export function getAllMessages(data: ReturnType<typeof useMessages>["data"]): Message[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.messages);
}
