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
app.use(express.static("public"));
app.use("/api", apiRoutes);

io.on("connection", (socket) => {
  socket.on("join", (deviceId) => {
    socket.join(deviceId);
    socket.emit(
      "bot-message",
      "Hello! Select 1 to Place an order, 99 to Checkout, 98 for History, 0 to Cancel.",
    );
  });

  socket.on("user-selection", async ({ sessionId, selection }) => {
    const response = await handleBotMessage(sessionId, selection);
    socket.emit("bot-response", { text: response });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
