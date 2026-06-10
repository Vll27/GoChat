import React from "react";
import { useContactStore } from "../store/useContactStore";
import { useAuthStore } from "../store/useAuthStore";

export default function NotificationBadge() {
  const { unreadCount } = useContactStore();
  const { authUser } = useAuthStore();
  
  if (!authUser || !unreadCount) return null;

  return (
    <div className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full animate-pulse">
      {unreadCount > 99 ? '99+' : unreadCount}
    </div>
  );
}