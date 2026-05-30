// backend/src/controllers/acceso.controller.js
import User from "../models/User.js";

export const obtenerSaludo = async (req, res) => {
  try {
    const { llave } = req.query;

    // PROTECCIÓN 1: Validar que sea string (evita objetos maliciosos)
    if (!llave || typeof llave !== "string") {
      return res.status(401).json({
        estado: "error",
        mensaje: "Acceso denegado. Se requiere llave de autorización.",
      });
    }

    // PROTECCIÓN 2: Sanitizar caracteres especiales
    const tokenLimpio = llave.replace(/[^a-zA-Z0-9_-]/g, "");
    
    if (tokenLimpio !== llave) {
      return res.status(401).json({
        estado: "error",
        mensaje: "Formato de llave inválido.",
      });
    }

    //  PROTECCIÓN 3: MongoDB/Mongoose automáticamente escapa el valor
    const usuario = await User.findOne({ token_acceso: tokenLimpio });

    if (!usuario) {
      return res.status(401).json({
        estado: "error",
        mensaje: "Credenciales inválidas.",
      });
    }

    return res.status(200).json({
      estado: "exito",
      data: {
        mensaje: `Bienvenido al sistema, ${usuario.fullName}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[ERROR CRITICO]:", error);
    return res.status(500).json({
      estado: "error",
      mensaje: "Fallo interno en el servidor.",
    });
  }
};