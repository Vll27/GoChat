import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../lib/axios";
import { useContactStore } from "../store/useContactStore";
import { useAuthStore } from "../store/useAuthStore";

export default function SearchUsersModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const { sendRequest } = useContactStore();
  const { authUser } = useAuthStore();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const search = async () => {
    if (!authUser) {
      console.log("⚠️ Búsqueda cancelada: usuario no autenticado");
      return;
    }
    
    if (!query.trim()) return;
    
    try {
      const res = await axiosInstance.get(`/messages/search?query=${encodeURIComponent(query)}`);
      if (isMounted.current) {
        setResults(res.data || []);
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log("Search users failed", error);
      }
    }
  };

  const handleSendRequest = async (userId) => {
    if (!authUser) {
      console.log("⚠️ Envío de solicitud cancelado: usuario no autenticado");
      return;
    }
    await sendRequest(userId);
  };

  useEffect(() => {
    if (!authUser && isOpen) {
      onClose();
    }
  }, [authUser, isOpen, onClose]);

  if (!isOpen) return null;
  if (!authUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-slate-900 p-4 rounded w-11/12 max-w-md">
        <div className="flex gap-2 mb-4">
          <input 
            className="flex-1 p-2 rounded bg-slate-800" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && search()}
            placeholder="Buscar usuarios..."
          />
          <button onClick={search} className="px-3 py-2 bg-cyan-600 rounded">Buscar</button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((u) => (
            <div key={u._id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src={u.profilePic || "/avatar.png"} className="w-full h-full object-cover" alt={u.fullName} />
                </div>
                <div>
                  <div className="text-slate-200">{u.fullName}</div>
                  <div className="text-slate-400 text-xs">{u.email}</div>
                </div>
              </div>
              <div>
                <button
                  onClick={() => handleSendRequest(u._id)}
                  className="px-3 py-1 bg-cyan-600 rounded text-white hover:bg-cyan-700 transition-colors"
                >
                  Enviar
                </button>
              </div>
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="text-center text-slate-400 py-4">
              No se encontraron usuarios
            </div>
          )}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}