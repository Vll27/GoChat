import React, { useEffect, useRef } from "react";
import { useContactStore } from "../store/useContactStore";
import { useAuthStore } from "../store/useAuthStore";
import RequestItem from "./RequestItem";

export default function ContactRequests() {
  const { requests, fetchRequests, subscribeToSocket } = useContactStore();
  const { authUser } = useAuthStore();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    if (authUser && isMounted.current) {
      subscribeToSocket();
      fetchRequests();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [authUser, fetchRequests, subscribeToSocket]);

  if (!authUser) return null;

  return (
    <div className="space-y-2">
      {requests.length === 0 ? (
        <div className="p-4 text-slate-400">Todo tranquilo por acá...</div>
      ) : (
        requests.map((r) => <RequestItem key={r._id} request={r} />)
      )}
    </div>
  );
}