"use client";

import { useRef, useEffect, useCallback } from "react";
import { MessageItem } from "./MessageItem";
import type { OptimisticMessage } from "@/lib/schemas/message";

interface MessageListProps {
  messages: OptimisticMessage[];
  currentUserId: string | null;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onEdit,
  onDelete,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll detection for loading more
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    // Load more when scrolled near the top
    if (container.scrollTop < 100) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Sort messages by created_at (oldest first for display)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => fetchNextPage()}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Load older messages
          </button>
        </div>
      )}

      <div className="space-y-1">
        {sortedMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwner={currentUserId === message.user_id}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
