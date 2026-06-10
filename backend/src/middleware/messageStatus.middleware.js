// Middleware para validar estados de mensajes
export const validateMessageStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ["sent", "delivered", "read"];
  
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: `Estado no válido. Debe ser uno de: ${validStatuses.join(", ")}` 
    });
  }
  
  next();
};

// Middleware para verificar que el usuario sea parte del chat
export const verifyChatParticipant = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    const Message = (await import("../models/Message.js")).default;
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }
    
    if (message.senderId.toString() !== userId.toString() && 
        message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "No eres parte de esta conversación" });
    }
    
    req.message = message;
    next();
  } catch (error) {
    console.error("Error en verifyChatParticipant:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Middleware para rate limiting en actualizaciones de estado
const statusUpdateTimestamps = new Map();

export const rateLimitStatusUpdate = (req, res, next) => {
  const userId = req.user._id.toString();
  const now = Date.now();
  const lastUpdate = statusUpdateTimestamps.get(userId) || 0;
  
  if (now - lastUpdate < 500) { // máximo 2 actualizaciones por segundo
    return res.status(429).json({ message: "Demasiadas solicitudes" });
  }
  
  statusUpdateTimestamps.set(userId, now);
  next();
};