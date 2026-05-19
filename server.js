import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { handleBotMessage, getMainMenu } from "./controllers/botController.js";
import Session from "./models/Session.js";
import apiRoutes from "./routes/api.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/api", apiRoutes);

io.on("connection", (socket) => {
  socket.on("join-chat", async ({ sessionId }) => {
    socket.join(sessionId);

    const session = await Session.findOne({ deviceId: sessionId });
    if (session && session.state !== "idle") {
      let recoveryGreeting = "Welcome back! ";
      if (
        session.state === "awaiting_category" ||
        session.state === "awaiting_item" ||
        session.state === "awaiting_quantity"
      ) {
        recoveryGreeting +=
          "You have an active ordering session open. Send 97 to view your basket or select 0 to reset.";
      } else if (session.state === "awaiting_payment") {
        recoveryGreeting +=
          "Your checkout order is waiting for confirmation. Please complete payment using the link provided.";
      } else {
        recoveryGreeting += "\n\n" + getMainMenu();
      }
      socket.emit("bot-response", { text: recoveryGreeting });
    } else {
      socket.emit("bot-response", { text: getMainMenu() });
    }
  });

  socket.on("user-selection", async ({ sessionId, selection }) => {
    const response = await handleBotMessage(sessionId, selection);
    socket.emit("bot-response", { text: response });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
