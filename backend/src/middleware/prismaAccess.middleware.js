import prisma from "../lib/prismaClient.js";

export const validarTokenAcceso = async (req, res, next) => {
  const token = req.params.tokenLlave || req.query.tokenLlave;
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const acceso = await prisma.acceso.findUnique({
      where: { tokenLlave: token },
    });

    if (!acceso) return res.status(401).json({ message: "Token inválido" });

    req.acceso = acceso; // attach for downstream handlers
    next();
  } catch (err) {
    console.error("Prisma access middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
