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
          className={`p-2 rounded transition-all duration-300 ease-in-out transform hover:scale-105 ${
            activeTab === "chats" ? "" : "text-slate-400"
          }`}
          style={
            activeTab === "chats"
              ? {
                  backgroundColor: "rgba(var(--theme-primary), 0.2)",
                  color: "var(--theme-primary)",
                }
              : {}
          }
        >
          <MessageCircle className="size-5" />
        </button>

        <button
          title="Contacts"
          aria-label="Contacts"
          onClick={() => setActiveTab("contacts")}
          className={`p-2 rounded transition-all duration-300 ease-in-out transform hover:scale-105 ${
            activeTab === "contacts" ? "" : "text-slate-400"
          }`}
          style={
            activeTab === "contacts"
              ? {
                  backgroundColor: "rgba(var(--theme-primary), 0.2)",
                  color: "var(--theme-primary)",
                }
              : {}
          }
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
        className={`tab ${activeTab === "chats" ? "" : "text-slate-400"}`}
        style={
          activeTab === "chats"
            ? {
                backgroundColor: "rgba(var(--theme-primary), 0.2)",
                color: "var(--theme-primary)",
              }
            : {}
        }
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`tab ${activeTab === "contacts" ? "" : "text-slate-400"}`}
        style={
          activeTab === "contacts"
            ? {
                backgroundColor: "rgba(var(--theme-primary), 0.2)",
                color: "var(--theme-primary)",
              }
            : {}
        }
      >
        Contactos
      </button>
    </div>
  );
}

export default ActiveTabSwitch;