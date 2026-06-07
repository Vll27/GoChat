import express from "express";
import multer from "multer";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  searchUsers,
  updateMessageStatus,
  markMessagesAsRead,
  getMessageInfo,
  editMessage,
  deleteMessage,
  copyMessage,
  addReaction,
  removeReaction,
  getMessageReactions,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Solo se permiten archivos de imagen o video"), false);
  },
});

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/search", searchUsers);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", upload.single("image"), sendMessage);

router.patch("/status/:messageId", updateMessageStatus);
router.post("/read/:senderId", markMessagesAsRead);

// Rutas para editar y eliminar
router.get("/info/:messageId", getMessageInfo);
router.patch("/edit/:messageId", editMessage);
router.delete("/delete/:messageId", deleteMessage);
router.post("/copy/:messageId", copyMessage);

// Rutas para reacciones
router.post("/react/:messageId", addReaction);
router.delete("/react/:messageId", removeReaction);
router.get("/react/:messageId", getMessageReactions);

export default router;