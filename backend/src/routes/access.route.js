import { Router } from "express";
import { randomUUID } from "crypto";
import prisma from "../lib/prismaClient.js";
import { validarTokenAcceso } from "../middleware/prismaAccess.middleware.js";

const router = Router();

// Endpoint de creación: genera un nuevo token Acceso
// POST /api/prisma/create?usuarioAsignado=tu_usuario
// o POST /api/prisma/create con body: { "usuarioAsignado": "tu_usuario" }
router.post("/create", async (req, res) => {
  const usuarioAsignado = req.body.usuarioAsignado || req.query.usuarioAsignado;

  if (!usuarioAsignado) {
    return res.status(400).json({ message: "Sin usuario asignado." });
  }

  try {
    const nuevoAcceso = await prisma.acceso.create({
      data: {
        usuarioAsignado,
        tokenLlave: randomUUID(),
      },
    });
    res.json({ sobre: true, acceso: nuevoAcceso });
  } catch (err) {
    console.error("Error creando Acceso:", err);
    res.status(500).json({ message: "Error creando Acceso" });
  }
});

// Ruta protegida de ejemplo. Se puede llamar como:
// GET /api/prisma/access/:tokenLlave
router.get("/access/:tokenLlave", validarTokenAcceso, (req, res) => {
  // req.acceso fue adjuntado por el middleware
  res.json({ sobre: true, acceso: req.acceso });
});

export default router;
