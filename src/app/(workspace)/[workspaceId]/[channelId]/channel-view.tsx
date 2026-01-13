"use client";

import { useEffect, useCallback, useState } from "react";
import { useMessages, getAllMessages } from "@/hooks/useMessages";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/useMessageMutations";
import { useWorkspaceStore } from "@/stores/workspace";
import { MessageList } from "@/components/messages/MessageList";
import { MessageInput } from "@/components/messages/MessageInput";
import { ConnectionStatus } from "@/components/messages/ConnectionStatus";
import type { OptimisticMessage } from "@/lib/schemas/message";

interface ChannelViewProps {
  workspaceId: string;
  channelId: string;
  channelName: string;
  userId: string;
}

export function ChannelView({ workspaceId, channelId, channelName, userId }: ChannelViewProps) {
  const [isConnected, setIsConnected] = useState(true);

  // Update workspace store
  const { setWorkspace, setChannel } = useWorkspaceStore();

  useEffect(() => {
    setWorkspace(workspaceId);
    setChannel(channelId);

    return () => {
      // Clear on unmount
    };
  }, [workspaceId, channelId, setWorkspace, setChannel]);

  // Messages query
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMessages(channelId);

  const messages = getAllMessages(data) as OptimisticMessage[];

  // Realtime subscription
  const { isConnected: realtimeConnected } = useRealtimeMessages(channelId, {
    onInsert: () => {
      // Auto-scroll handled in MessageList
    },
  });

  useEffect(() => {
    setIsConnected(realtimeConnected);
  }, [realtimeConnected]);

  // Mutations
  const sendMessage = useSendMessage(channelId);
  const editMessage = useEditMessage(channelId);
  const deleteMessage = useDeleteMessage(channelId);

  // Handlers
  const handleSend = useCallback(
    (body: string) => {
      sendMessage.mutate({ body });
    },
    [sendMessage]
  );

  const handleEdit = useCallback(
    (messageId: string, body: string) => {
      editMessage.mutate({ messageId, body });
    },
    [editMessage]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      deleteMessage.mutate({ messageId });
    },
    [deleteMessage]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">#{channelName}</h1>
      </header>

      {/* Connection status */}
      <ConnectionStatus isConnected={isConnected} />

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={userId}
        isLoading={isLoading}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} isPending={sendMessage.isPending} />
    </div>
  );
}
