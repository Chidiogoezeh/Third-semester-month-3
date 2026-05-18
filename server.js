import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { handleBotMessage } from "./controllers/botController.js";
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

const INITIAL_GREETING = `Welcome to Naija Bite! Select options below:
1. Select 1 to Place an order
99. Select 99 to checkout order
98. Select 98 to see order history
97. Select 97 to see current order
0. Select 0 to cancel order`;

io.on("connection", (socket) => {
  socket.on("join-chat", async ({ sessionId }) => {
    socket.join(sessionId);

    const session = await Session.findOne({ deviceId: sessionId });
    if (session && session.state !== "idle") {
      let recoveryGreeting = "Welcome back! ";
      if (session.state === "ordering") {
        recoveryGreeting +=
          "You have an active ordering session open. Send 97 to view your basket or select 0 to reset.";
      } else if (session.state === "scheduling") {
        recoveryGreeting +=
          "You have an uncompleted order checkout pending. Please provide a scheduling window or type 'SKIP'.";
      } else if (session.state === "awaiting_payment") {
        recoveryGreeting +=
          "Your checkout order is waiting for confirmation. Type 'PAY' to initiate payment.";
      }
      socket.emit("bot-response", { text: recoveryGreeting });
    } else {
      socket.emit("bot-response", { text: INITIAL_GREETING });
    }
  });

  socket.on("user-selection", async ({ sessionId, selection }) => {
    const response = await handleBotMessage(sessionId, selection);
    socket.emit("bot-response", { text: response });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
