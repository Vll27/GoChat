import User from "../models/User.js";

export const getUserLastSeen = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const cleanUserId = userId && typeof userId === "string" ? userId.trim() : "";

    if (!cleanUserId) {
      return res.status(400).json({ message: "Se requiere un ID de usuario válido." });
    }
    
    const user = await User.findById(cleanUserId).select("lastSeen lastSeenStatus fullName");
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado en el sistema." });
    }
    
    res.status(200).json({
      userId: user._id,
      lastSeen: user.lastSeen,
      status: user.lastSeenStatus,
      fullName: user.fullName
    });
  } catch (error) {
    console.error("❌ Error en getUserLastSeen:", error.message);
    res.status(500).json({ message: "Error interno del servidor al consultar el estado de conexión." });
  }
};

export const updateUserLastSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.body;
    
    // Validamos que el estado entrante sea una cadena limpia y aceptada
    const cleanStatus = status && typeof status === "string" ? status.trim().toLowerCase() : "online";
    const finalStatus = ["online", "offline"].includes(cleanStatus) ? cleanStatus : "online";
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        lastSeen: new Date(),
        lastSeenStatus: finalStatus
      },
      { new: true }
    ).select("lastSeen lastSeenStatus");
    
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error en updateUserLastSeen:", error.message);
    res.status(500).json({ message: "Error interno del servidor al actualizar el estado de presencia." });
  }
};