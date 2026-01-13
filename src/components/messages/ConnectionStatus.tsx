"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  if (isConnected) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-800 border-t-transparent" />
      <span>Reconnecting...</span>
    </div>
  );
}
