export const formatLastSeen = (lastSeen, isOnline = false) => {
  if (isOnline) return "En línea";
  if (!lastSeen) return "Última vez desconocida";
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Recién desconectado - mostrar segundos
  if (diffInSeconds < 60) {
    return `Última vez hace ${diffInSeconds} ${diffInSeconds === 1 ? 'segundo' : 'segundos'}`;
  }
  
  if (diffInMinutes < 60) {
    return `Última vez hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  if (diffInHours < 24 && lastSeenDate.getDate() === now.getDate()) {
    return `Última vez hoy a las ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (lastSeenDate.getDate() === yesterday.getDate() && 
      lastSeenDate.getMonth() === yesterday.getMonth()) {
    return `Última vez ayer a las ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  if (diffInDays < 7) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `Última vez el ${days[lastSeenDate.getDay()]} a las ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return `Última vez el ${lastSeenDate.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}`;
};

export const getShortLastSeen = (lastSeen, isOnline = false) => {
  if (isOnline) return "En línea";
  if (!lastSeen) return "";
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  
  if (diffInSeconds < 60) {
    return `Hace ${diffInSeconds}s`;
  }
  
  if (diffInHours < 24) {
    return `Últ. ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffInHours < 48) {
    return "Ayer";
  } else {
    return lastSeenDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }
};