import { useChatStore } from "../store/useChatStore";
import { MessageCircle } from "lucide-react";

const NoConversationPlaceholder = () => {
  const { activeTab } = useChatStore();
  
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-none p-4 sm:p-6 lg:p-8 text-center">
      {/* Contenedor */}
      <div className="w-full max-w-none mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32">
        {/* Icono responsive */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 text-slate-400" />
          </div>
        </div>
        
        {/* Texto responsive */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-200 mb-2 sm:mb-3 lg:mb-4">
          Selecciona una conversación
        </h2>
        <p className="text-slate-400 text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed">
          Elige un contacto de la barra lateral para empezar a chatear o continuar una conversación anterior.<br className="hidden sm:block" />
           
        </p>
      </div>
    </div>
  );
}

export default NoConversationPlaceholder;