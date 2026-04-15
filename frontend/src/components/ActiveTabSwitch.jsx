import { useChatStore } from "../store/useChatStore";
import { MessageCircle, Users } from "lucide-react";

function ActiveTabSwitch({ compact = false }) {
  const { activeTab, setActiveTab } = useChatStore();

  if (compact) {
    return (
      <div className="flex gap-2 items-center transition-all duration-300 ease-in-out">
        <button
          title="Chats"
          aria-label="Chats"
          onClick={() => setActiveTab("chats")}
          className={`p-2 rounded ${activeTab === "chats" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"} transition-all duration-300 ease-in-out transform hover:scale-105`}
        >
          <MessageCircle className="size-5" />
        </button>

        <button
          title="Contacts"
          aria-label="Contacts"
          onClick={() => setActiveTab("contacts")}
          className={`p-2 rounded ${activeTab === "contacts" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"} transition-all duration-300 ease-in-out transform hover:scale-105`}
        >
          <Users className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="tabs tabs-boxed bg-transparent p-2 m-2">
      <button
        onClick={() => setActiveTab("chats")}
        className={`tab ${
          activeTab === "chats" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"
        }`}
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`tab ${
          activeTab === "contacts" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"
        }`}
      >
        Contactos
      </button>
    </div>
  );
}

export default ActiveTabSwitch;
