"use client";

import { useState, FormEvent } from "react";

interface MessageInputProps {
  onSend: (body: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function MessageInput({ onSend, disabled = false, isPending = false }: MessageInputProps) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || disabled || isPending) return;

    onSend(trimmed);
    setBody("");
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled || isPending}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
        />
        <button
          type="submit"
          disabled={!body.trim() || disabled || isPending}
          className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending
            </span>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </form>
  );
}
