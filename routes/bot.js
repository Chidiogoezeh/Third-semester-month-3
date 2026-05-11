import express from "express";
const router = express.Router();
import * as botController from "../controllers/botController.js";

// Since we are using WebSockets for the chat,
// this route handles the initial session or status checks
router.post("/session", (req, res) => {
  const { deviceId } = req.body;
  // Logic to initialize or retrieve session
  res.status(200).json({ status: "success", deviceId });
});

export default router;
