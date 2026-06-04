export const formatLastSeen = (lastSeen, isOnline = false) => {
  if (isOnline) return "En línea";
  if (!lastSeen) return "Últ. vez desconocida";
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  
  // Recién desconectado - mostrar segundos
  if (diffInSeconds < 60) {
    return `Últ. vez hace ${diffInSeconds} ${diffInSeconds === 1 ? 'segundo' : 'segundos'}`;
  }
  
  // Menos de 1 hora
  if (diffInMinutes < 60) {
    return `Últ. vez hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  // Función para formatear hora
  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 🔧 MODIFICADO: Calcular diferencia en días correctamente
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfLastSeen = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());
  const diffInDays = Math.floor((startOfToday - startOfLastSeen) / (1000 * 60 * 60 * 24));
  
  // 🔧 MODIFICADO: Hoy (diferencia 0 días)
  if (diffInDays === 0) {
    return `Últ. vez hoy a las ${formatTime(lastSeenDate)}`;
  }
  
  // 🔧 MODIFICADO: Ayer (diferencia 1 día)
  if (diffInDays === 1) {
    return `Últ. vez ayer a las ${formatTime(lastSeenDate)}`;
  }
  
  // 🔧 MODIFICADO: Antier y días anteriores - formato día/mes/año
  const formatDateWithYear = (date) => {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };
  
  return `Últ. vez ${formatDateWithYear(lastSeenDate)} a las ${formatTime(lastSeenDate)}`;
};

export const getShortLastSeen = (lastSeen, isOnline = false) => {
  if (isOnline) return "";
  if (!lastSeen) return "";
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  
  // 🔧 MODIFICADO: Calcular diferencia en días correctamente
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfLastSeen = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());
  const diffInDays = Math.floor((startOfToday - startOfLastSeen) / (1000 * 60 * 60 * 24));
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 🔧 MODIFICADO: Hoy
  if (diffInDays === 0) {
    return `Hoy ${formatTime(lastSeenDate)}`;
  }
  
  // 🔧 MODIFICADO: Ayer
  if (diffInDays === 1) {
    return `Ayer ${formatTime(lastSeenDate)}`;
  }
  
  // 🔧 MODIFICADO: Antier y días anteriores - formato día/mes
  const formatShortDate = (date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };
  
  return `${formatShortDate(lastSeenDate)} ${formatTime(lastSeenDate)}`;
};