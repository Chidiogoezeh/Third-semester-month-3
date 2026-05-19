import { sendMessage, onMessage, socket } from "./socket-client.js";

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

// Securely isolate device session allocation
let sessionId = localStorage.getItem("bot_session");
if (!sessionId) {
  sessionId = "sess_" + crypto.randomUUID();
  localStorage.setItem("bot_session", sessionId);
}

const createMessageElement = (text, sender) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender === "user" ? "user-msg" : "bot-msg");

  if (text.startsWith("PAY_LINK|")) {
    const [, url, orderId] = text.split("|");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.textContent = "Click here to securely pay via Paystack";
    link.className = "payment-action-button";
    msgDiv.appendChild(link);
  } else {
    text.split("\n").forEach((line) => {
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

// Unified response listener capturing validation failures and dynamic selections
onMessage("bot-response", (data) => {
  if (data && data.text) {
    appendMessage(data.text, "bot");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  socket.on("connect", () => {
    sendMessage("join-chat", { sessionId });

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const orderId = urlParams.get("orderId");

    if (paymentStatus === "success" && orderId) {
      sendMessage("verify-payment-status", { sessionId, orderId });
    } else if (paymentStatus === "failed") {
      appendMessage(
        "Payment tracking verification failed. Please try again from option 99.",
        "bot",
      );
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  });
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rawInput = userInput.value.trim();
  if (!rawInput) return;

  appendMessage(rawInput, "user");

  // Forward standardized payloads to server state machine
  sendMessage("user-selection", {
    sessionId,
    selection: rawInput,
  });

  userInput.value = "";
});
