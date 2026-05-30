import express from "express";
import { getUserLastSeen, updateUserLastSeen } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:userId/lastseen", protectRoute, getUserLastSeen);
router.put("/lastseen", protectRoute, updateUserLastSeen);

export default router;