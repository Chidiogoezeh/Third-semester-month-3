import socket, { sendMessage, onMessage } from "./socket-client.js";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

let sessionId =
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
    link.classList.add("payment-action-button");
    msgDiv.appendChild(link);
  } else {
    const content = document.createElement("p");
    content.textContent = text;
    msgDiv.appendChild(content);
  }
  return msgDiv;
};

const appendMessage = (text, sender) => {
  const msg = createMessageElement(text, sender);
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

onMessage("bot-response", (data) => {
  appendMessage(data.text, "bot");
});

window.addEventListener("DOMContentLoaded", () => {
  sendMessage("join-chat", { sessionId });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("payment") === "success") {
    const orderParam = urlParams.get("orderId");
    const trailingId = orderParam ? " (ID: " + orderParam.slice(-5) + ")" : "";
    setTimeout(() => {
      appendMessage(
        "Payment Successful! Your order" +
          trailingId +
          " has been validated and confirmed.",
        "bot",
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 500);
  } else if (urlParams.get("payment") === "failed") {
    setTimeout(() => {
      appendMessage(
        "Transaction Verification Failed. Please try again or contact support.",
        "bot",
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 500);
  }
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  sendMessage("user-selection", { sessionId, selection: message });
  userInput.value = "";
});
