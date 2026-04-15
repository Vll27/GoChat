import User from "../models/User.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const sendContactRequest = async (req, res) => {
  try {
    const fromUser = req.user; // poblado por protectRoute
    const { targetUserId } = req.body;

    if (!targetUserId) return res.status(400).json({ message: "Se requiere targetUserId" });
    if (fromUser._id.toString() === targetUserId) return res.status(400).json({ message: "No puedes enviarte solicitud a ti mismo" });

    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ message: "Usuario objetivo no encontrado" });

    // ¿Ya son contactos?
    if (target.contacts.includes(fromUser._id) || fromUser.contacts.includes(target._id)) {
      return res.status(400).json({ message: "Ya son contactos" });
    }

    // ¿Ya se envió la solicitud?
    if (target.pendingRequests.includes(fromUser._id)) {
      return res.status(400).json({ message: "Ya has enviado la solicitud." });
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

    res.status(200).json({ message: "Se envió una solicitud de contacto." });
  } catch (error) {
    console.error(" Error en sendContactRequest:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("pendingRequests", "fullName profilePic email");
    res.status(200).json(user.pendingRequests || []);
  } catch (error) {
    console.error(" Error en getMyRequests:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const user = req.user; 
    const { requesterId } = req.body;
    if (!requesterId) return res.status(400).json({ message: "Se requiere requesterId" });

    const requester = await User.findById(requesterId);
    if (!requester) return res.status(404).json({ message: "Solicitante no encontrado" });

    // eliminar de pendientes
    user.pendingRequests = user.pendingRequests.filter((id) => id.toString() !== requesterId);

    // agregar a contactos en ambos sentidos si no existen
    if (!user.contacts.includes(requester._id)) user.contacts.push(requester._id);
    if (!requester.contacts.includes(user._id)) requester.contacts.push(user._id);

    await user.save();
    await requester.save();

    // emitir evento socket al solicitante
    const receiverSocketId = getReceiverSocketId(requesterId);
    const payload = {
      to: {
        _id: user._id,
        fullName: user.fullName,
        profilePic: user.profilePic,
      },
    };
    if (receiverSocketId) io.to(receiverSocketId).emit("request_accepted", payload);

    // también notificar al cliente del aceptador para actualizar solicitudes
    const acceptorSocketId = getReceiverSocketId(user._id.toString());
    if (acceptorSocketId) io.to(acceptorSocketId).emit("update_requests");

    res.status(200).json({ message: "Solicitud aceptada" });
  } catch (error) {
    console.error(" Error en acceptRequest:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const user = req.user;
    const { requesterId } = req.body;
    if (!requesterId) return res.status(400).json({ message: "Se requiere requesterId" });

    // eliminar de pendientes
    user.pendingRequests = user.pendingRequests.filter((id) => id.toString() !== requesterId);
    await user.save();

    // notificar al solicitante si está en línea
    const receiverSocketId = getReceiverSocketId(requesterId);
    const payload = {
      from: {
        _id: user._id,
        fullName: user.fullName,
      },
    };
    if (receiverSocketId) io.to(receiverSocketId).emit("request_rejected", payload);

    // notificar al cliente del aceptador
    const acceptorSocketId = getReceiverSocketId(user._id.toString());
    if (acceptorSocketId) io.to(acceptorSocketId).emit("update_requests");

    res.status(200).json({ message: "Solicitud rechazada" });
  } catch (error) {
    console.error(" Error en rejectRequest:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};