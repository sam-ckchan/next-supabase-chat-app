"use client";

import { formatDistanceToNow } from "@/lib/utils/date";
import type { OptimisticMessage } from "@/lib/schemas/message";
import { MessageActions } from "./MessageActions";
import { useState } from "react";
import { TimeAgo } from "./TimeAgo";

interface MessageItemProps {
  message: OptimisticMessage;
  isOwner: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function MessageItem({ message, isOwner, onEdit, onDelete }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);

  const isEdited =
    new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() + 1000;

  const handleSaveEdit = () => {
    if (editBody.trim() && editBody !== message.body) {
      onEdit(message.id, editBody);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditBody(message.body);
    setIsEditing(false);
  };

  return (
    <div
      className={`group flex flex-col gap-1 rounded-lg p-3 hover:bg-gray-50 ${
        message._optimistic ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
            {message.user_id.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900">
            User {message.user_id.slice(0, 8)}
          </span>
          <span className="text-xs text-gray-500">
            <TimeAgo date={new Date(message.created_at)} />
          </span>
          {isEdited && <span className="text-xs text-gray-400 italic">(edited)</span>}
          {message._optimistic && <span className="text-xs text-blue-500">sending...</span>}
        </div>

        {isOwner && !message._optimistic && (
          <MessageActions onEdit={() => setIsEditing(true)} onDelete={() => onDelete(message.id)} />
        )}
      </div>

      {isEditing ? (
        <div className="ml-10 flex flex-col gap-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="ml-10 text-sm text-gray-700 whitespace-pre-wrap">{message.body}</p>
      )}
    </div>
  );
}
