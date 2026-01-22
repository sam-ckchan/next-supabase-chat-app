"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "@/lib/utils/date";

export function TimeAgo({ date }: { date: Date }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  return formatDistanceToNow(date);
}
