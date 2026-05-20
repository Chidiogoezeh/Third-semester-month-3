import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { handleBotMessage, getMainMenu } from "./controllers/botController.js";
import Session from "./models/Session.js";
import apiRoutes from "./routes/api.js";
import botRoutes from "./routes/bot.js";
import { PAYSTACK_CONFIG } from "./config/paystack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve secure admin portal route with backend gatekeeping mechanisms
app.get("/admin", (req, res) => {
  const token = req.query.token;
  if (token === PAYSTACK_CONFIG.admin_secret) {
    return res.sendFile(path.join(__dirname, "views", "admin.html"));
  }
  res
    .status(401)
    .send("Access Denied: Administrative Session Token Missing or Invalid.");
});

// Static files served strictly after specific dynamic authorization interceptors
app.use(express.static("public"));

app.use(
  "/api",
  (req, res, next) => {
    req.io = io;
    next();
  },
  apiRoutes,
);

app.use("/bot", botRoutes);

io.on("connection", (socket) => {
  socket.on("join-chat", async ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);

    try {
      const session = await Session.findOne({ deviceId: sessionId });
      if (session && session.state !== "idle") {
        let recoveryGreeting = "Welcome back! ";
        if (
          ["awaiting_category", "awaiting_item", "awaiting_quantity"].includes(
            session.state,
          )
        ) {
          recoveryGreeting +=
            "You have an active ordering session open. Send 97 to view your basket or select 0 to reset.";
        } else if (session.state === "awaiting_payment") {
          recoveryGreeting +=
            "Your checkout order is waiting for confirmation. Please complete payment using the link provided, or enter 9 to access the main menu.";
        } else {
          recoveryGreeting += "\n\n" + getMainMenu();
        }
        socket.emit("bot-response", { text: recoveryGreeting });
      } else {
        socket.emit("bot-response", { text: getMainMenu() });
      }
    } catch (err) {
      socket.emit("bot-response", {
        text: "System connection dropped. Send 0 to refresh state loops manually.",
      });
    }
  });

  socket.on("user-selection", async ({ sessionId, selection }) => {
    if (!sessionId || !selection) return;
    const response = await handleBotMessage(sessionId, selection);
    io.to(sessionId).emit("bot-response", { text: response });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () =>
  console.log(`Server running safely on port ${PORT}`),
);
