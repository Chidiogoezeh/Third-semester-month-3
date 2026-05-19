import { sendMessage, onMessage, socket } from "./socket-client.js";

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

const sessionId =
  localStorage.getItem("bot_session") ||
  "sess_" + Math.random().toString(36).substr(2, 9);
localStorage.setItem("bot_session", sessionId);

const createMessageElement = (text, sender) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender === "user" ? "user-msg" : "bot-msg");

  if (text.startsWith("PAY_LINK|")) {
    const url = text.split("|")[1];
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.textContent = "Click here to securely pay via Paystack";
    link.className = "payment-action-button";
    msgDiv.appendChild(link);
  } else {
    const lines = text.split("\n");
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      msgDiv.appendChild(p);
    });
  }
  return msgDiv;
};

const appendMessage = (text, sender) => {
  const msg = createMessageElement(text, sender);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
};

onMessage("bot-response", (data) => {
  appendMessage(data.text, "bot");
});

window.addEventListener("DOMContentLoaded", () => {
  // Execute checks safely after WebSocket is confirmed ready
  socket.on("connect", () => {
    sendMessage("join-chat", { sessionId });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
      const orderParam = urlParams.get("orderId");
      sendMessage("verify-payment-status", { sessionId, orderId: orderParam });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("payment") === "failed") {
      appendMessage(
        "Transaction Verification Failed. Please try again or contact support.",
        "bot",
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  sendMessage("user-selection", { sessionId, selection: message });
  userInput.value = "";
});
