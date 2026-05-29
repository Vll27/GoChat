import React, { useState } from "react";
import { axiosInstance } from "../lib/axios";
import { useContactStore } from "../store/useContactStore";

export default function SearchUsersModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const { sendRequest } = useContactStore();

  const search = async () => {
    try {
      const res = await axiosInstance.get(`/messages/search?query=${encodeURIComponent(query)}`);
      setResults(res.data || []);
    } catch (error) {
      console.log("Search users failed", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-slate-900 p-4 rounded w-11/12 max-w-md">
        <div className="flex gap-2 mb-4">
          <input className="flex-1 p-2 rounded bg-slate-800" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuarios..." />
          <button onClick={search} className="px-3 py-2 bg-cyan-600 rounded">Buscar</button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((u) => (
            <div key={u._id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src={u.profilePic || "/avatar.png"} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-slate-200">{u.fullName}</div>
                  <div className="text-slate-400 text-xs">{u.email}</div>
                </div>
              </div>
              <div>
                <button
                  onClick={() => sendRequest(u._id)}
                  className="px-3 py-1 bg-cyan-600 rounded text-white"
                >
                  Enviar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-2 bg-slate-700 rounded">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
