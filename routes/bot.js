import express from "express";
const router = express.Router();

router.post("/session", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId || typeof deviceId !== "string" || deviceId.trim().length < 5) {
    return res
      .status(400)
      .json({
        status: "error",
        message: "Malformatted Session Identifier Pattern",
      });
  }
  res.status(200).json({ status: "success", deviceId: deviceId.trim() });
});

export default router;
