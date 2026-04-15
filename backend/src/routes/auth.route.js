import express from "express";
import { signup, login, logout, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// Aplica arcjetProtection solo a rutas públicas/no autenticadas
router.post("/signup", arcjetProtection, signup);
router.post("/login", arcjetProtection, login);
router.post("/logout", arcjetProtection, logout);

// NO usando arcjetProtection en /check
// Esta ruta ya está protegida por protectRoute y se llama frecuentemente
router.get("/check", protectRoute, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    fullName: req.user.fullName,
    email: req.user.email,
    profilePic: req.user.profilePic,
  });
});

router.put("/update-profile", protectRoute, updateProfile);

export default router;