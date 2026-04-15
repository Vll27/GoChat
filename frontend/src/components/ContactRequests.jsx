import React, { useEffect } from "react";
import { useContactStore } from "../store/useContactStore";
import RequestItem from "./RequestItem";

export default function ContactRequests() {
  const { requests, fetchRequests, subscribeToSocket } = useContactStore();

  useEffect(() => {
    subscribeToSocket();
    fetchRequests();
  }, []);

  return (
    <div className="space-y-2">
      {requests.length === 0 ? (
        <div className="p-4 text-slate-400">No hay solicitudes pendientes.</div>
      ) : (
        requests.map((r) => <RequestItem key={r._id} request={r} />)
      )}
    </div>
  );
}
