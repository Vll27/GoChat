import User from "../models/User.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const sendContactRequest = async (req, res) => {
  try {
    const fromUser = req.user; // Poblado por protectRoute
    const { targetUserId } = req.body;

    // Hardening perimetral del parámetro de entrada
    const cleanTargetUserId = targetUserId && typeof targetUserId === "string" ? targetUserId.trim() : "";

    if (!cleanTargetUserId) {
      return res.status(400).json({ message: "Se requiere un ID de usuario objetivo válido." });
    }
    
    if (fromUser._id.toString() === cleanTargetUserId) {
      return res.status(400).json({ message: "No puedes enviarte una solicitud de contacto a ti mismo." });
    }

    const target = await User.findById(cleanTargetUserId);
    if (!target) {
      return res.status(404).json({ message: "Usuario objetivo no encontrado." });
    }

    // ¿Ya son contactos?
    if (target.contacts.includes(fromUser._id) || fromUser.contacts.includes(target._id)) {
      return res.status(400).json({ message: "El usuario ya se encuentra en tu lista de contactos." });
    }

    // ¿Ya se envió la solicitud?
    if (target.pendingRequests.includes(fromUser._id)) {
      return res.status(400).json({ message: "Ya has enviado una solicitud a este usuario." });
    }

    target.pendingRequests.push(fromUser._id);
    await target.save();

    // Emitir evento socket al objetivo si está en línea
    const receiverSocketId = getReceiverSocketId(target._id.toString());
    const payload = {
      from: {
        _id: fromUser._id,
        fullName: fromUser.fullName,
        profilePic: fromUser.profilePic,
      },
    };

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("contact_request", payload);
    }

    res.status(200).json({ message: "Se envió la solicitud de contacto exitosamente." });
  } catch (error) {
    console.error("❌ Error en sendContactRequest:", error.message);
    res.status(500).json({ message: "Error interno del servidor al procesar la solicitud de contacto." });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    // req.user._id viene seguro del middleware de autenticación
    const user = await User.findById(req.user._id).populate("pendingRequests", "fullName profilePic email");
    res.status(200).json(user.pendingRequests || []);
  } catch (error) {
    console.error("❌ Error en getMyRequests:", error.message);
    res.status(500).json({ message: "Error interno del servidor al obtener las solicitudes de contacto." });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const user = req.user; 
    const { requesterId } = req.body;
    
    const cleanRequesterId = requesterId && typeof requesterId === "string" ? requesterId.trim() : "";

    if (!cleanRequesterId) {
      return res.status(400).json({ message: "Se requiere un ID de solicitante válido." });
    }

    const requester = await User.findById(cleanRequesterId);
    if (!requester) {
      return res.status(404).json({ message: "Solicitante no encontrado." });
    }

    // Eliminar de pendientes
    user.pendingRequests = user.pendingRequests.filter((id) => id.toString() !== cleanRequesterId);

    // Agregar a contactos en ambos sentidos si no existen
    if (!user.contacts.includes(requester._id)) user.contacts.push(requester._id);
    if (!requester.contacts.includes(user._id)) requester.contacts.push(user._id);

    await user.save();
    await requester.save();

    // Emitir evento socket al solicitante
    const receiverSocketId = getReceiverSocketId(cleanRequesterId);
    const payload = {
      to: {
        _id: user._id,
        fullName: user.fullName,
        profilePic: user.profilePic,
      },
    };
    if (receiverSocketId) io.to(receiverSocketId).emit("request_accepted", payload);

    // Notificar al cliente del aceptador para actualizar solicitudes
    const acceptorSocketId = getReceiverSocketId(user._id.toString());
    if (acceptorSocketId) io.to(acceptorSocketId).emit("update_requests");

    res.status(200).json({ message: "Solicitud de contacto aceptada exitosamente." });
  } catch (error) {
    console.error("❌ Error en acceptRequest:", error.message);
    res.status(500).json({ message: "Error interno del servidor al aceptar la solicitud." });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const user = req.user;
    const { requesterId } = req.body;
    
    const cleanRequesterId = requesterId && typeof requesterId === "string" ? requesterId.trim() : "";

    if (!cleanRequesterId) {
      return res.status(400).json({ message: "Se requiere un ID de solicitante válido." });
    }

    // Eliminar de pendientes
    user.pendingRequests = user.pendingRequests.filter((id) => id.toString() !== cleanRequesterId);
    await user.save();

    // Notificar al solicitante si está en línea
    const receiverSocketId = getReceiverSocketId(cleanRequesterId);
    const payload = {
      from: {
        _id: user._id,
        fullName: user.fullName,
      },
    };
    if (receiverSocketId) io.to(receiverSocketId).emit("request_rejected", payload);

    // Notificar al cliente del aceptador
    const acceptorSocketId = getReceiverSocketId(user._id.toString());
    if (acceptorSocketId) io.to(acceptorSocketId).emit("update_requests");

    res.status(200).json({ message: "Solicitud de contacto rechazada." });
  } catch (error) {
    console.error("❌ Error en rejectRequest:", error.message);
    res.status(500).json({ message: "Error interno del servidor al rechazar la solicitud." });
  }
};