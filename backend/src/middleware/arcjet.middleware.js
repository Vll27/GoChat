import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
  try {
    // Excluir rutas autenticadas y de verificación de salud
    const excludedPaths = [
      '/check',           // Verificación de autenticación
      '/health',          // Endpoints de salud
      '/api/status'       // Status checks
    ];
    
    if (excludedPaths.includes(req.path)) {
      console.log(" Arcjet skipped for:", req.path);
      return next();
    }

    console.log(" Arcjet protecting:", req.path);
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      console.log(" Arcjet denied request:", decision.reason);
      
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
      } else if (decision.reason.isBot()) {
        return res.status(403).json({ message: "Bot access denied." });
      } else {
        return res.status(403).json({
          message: "Access denied by security policy.",
        });
      }
    }

    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({
        error: "Spoofed bot detected",
        message: "Malicious bot activity detected.",
      });
    }

    console.log(" Arcjet passed for:", req.path);
    next();
  } catch (error) {
    console.log(" Arcjet Protection Error:", error);
    // En caso de error en Arcjet, permitir que continúe la petición
    next();
  }
};