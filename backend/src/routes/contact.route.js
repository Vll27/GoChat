import express from "express";
import { sendContactRequest, getMyRequests, acceptRequest, rejectRequest } from "../controllers/contact.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/send", sendContactRequest);
router.get("/requests", getMyRequests);
router.post("/accept", acceptRequest);
router.post("/reject", rejectRequest);

export default router;
