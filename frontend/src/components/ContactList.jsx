import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function ContactList({ compact = false }) {
  const { getAllContacts, allContacts, isUsersLoading, setSelectedUser, selectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="space-y-2">
      {allContacts.map((contact) => (
        <div
          key={contact._id}
          onClick={() => setSelectedUser(contact)}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            compact ? "justify-center hover:bg-slate-700/30" : "hover:bg-slate-700/30"
          } ${selectedUser?._id === contact._id ? "bg-slate-700/50" : ""}`}
          title={compact ? contact.fullName : ""}
        >
          {/* Avatar con indicador online */}
          <div className="flex-shrink-0 relative">
            <div className={`${compact ? "w-8 h-8" : "w-12 h-12"} rounded-full bg-slate-600 flex items-center justify-center overflow-hidden`}>
              <img
                src={contact.profilePic || "/avatar.png"}
                alt={contact.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            {onlineUsers.includes(contact._id) && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
            )}
          </div>

          {/* Contenido - oculto cuando está compacto */}
          {!compact && (
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-200 truncate">
                {contact.fullName}
              </h4>
              <p className="text-sm text-slate-400 truncate">
                {contact.email}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ContactList;