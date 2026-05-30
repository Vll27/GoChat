import express from "express";
import { obtenerSaludo } from "../controllers/acceso.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/saludo", protectRoute, obtenerSaludo);

export default router;