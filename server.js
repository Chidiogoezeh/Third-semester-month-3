import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { handleBotMessage } from "./controllers/botController.js";
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
    const initialGreeting = `Welcome to Naija Bite! Select options below:\n1. Select 1 to Place an order\n99. Select 99 to checkout order\n98. Select 98 to see order history\n97. Select 97 to see current order\n0. Select 0 to cancel order`;
    socket.emit("bot-response", { text: initialGreeting });
  });

  socket.on("user-selection", async ({ sessionId, selection }) => {
    const response = await handleBotMessage(sessionId, selection);
    socket.emit("bot-response", { text: response });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
