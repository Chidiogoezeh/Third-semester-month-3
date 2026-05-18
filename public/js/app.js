import socket, { sendMessage, onMessage } from "./socket-client.js";

const chatBox = document.getElementById("chat-box");
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
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      const p = document.createElement("p");
      p.textContent = line;
      msgDiv.appendChild(p);
      if (index < lines.length - 1) {
        msgDiv.appendChild(document.createElement("br"));
      }
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
  sendMessage("join-chat", { sessionId });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("payment") === "success") {
    const orderParam = urlParams.get("orderId");
    const trailingId = orderParam ? " (ID: " + orderParam.slice(-5) + ")" : "";
    setTimeout(() => {
      appendMessage(
        "Payment Successful! Your order" +
          trailingId +
          " has been validated and confirmed.\n\n" +
          "Welcome to Naija Bite! Select options below:\n" +
          "1. Select 1 to Place a new order\n" +
          "99. Select 99 to checkout order\n" +
          "98. Select 98 to see order history\n" +
          "97. Select 97 to see current order\n" +
          "0. Select 0 to cancel order",
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
