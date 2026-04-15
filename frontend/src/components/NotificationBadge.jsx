import React from "react";
import { useContactStore } from "../store/useContactStore";

export default function NotificationBadge() {
  const { unreadCount } = useContactStore();
  if (!unreadCount) return null;

  return (
    <div className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full animate-pulse">
      {unreadCount}
    </div>
  );
}
