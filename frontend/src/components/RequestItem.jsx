import React from "react";
import { useContactStore } from "../store/useContactStore";
import { useAuthStore } from "../store/useAuthStore";

export default function RequestItem({ request }) {
  const { acceptRequest, rejectRequest } = useContactStore();
  const { authUser } = useAuthStore();

  const handleAccept = async () => {
    if (!authUser) {
      console.log("⚠️ No se puede aceptar: usuario no autenticado");
      return;
    }
    await acceptRequest(request._id);
  };

  const handleReject = async () => {
    if (!authUser) {
      console.log("⚠️ No se puede rechazar: usuario no autenticado");
      return;
    }
    await rejectRequest(request._id);
  };

  if (!authUser) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img 
            src={request.profilePic || "/avatar.png"} 
            alt={request.fullName}
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-slate-200 font-medium truncate">{request.fullName}</div>
          <div className="text-slate-400 text-xs truncate">{request.email}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 ml-3 flex-shrink-0">
        <button
          onClick={handleAccept}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors w-full min-w-[80px]"
        >
          Aceptar
        </button>
        <button
          onClick={handleReject}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors w-full min-w-[80px]"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}