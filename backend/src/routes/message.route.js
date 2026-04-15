import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  searchUsers,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// Los middlewares se ejecutan en orden, por lo que las solicitudes se limitan primero y luego se autentican.
// Esto es más eficiente, ya que las solicitudes no autenticadas se bloquean mediante la limitación de velocidad antes de llegar al middleware de autenticación.
router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/search", searchUsers);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);

export default router;