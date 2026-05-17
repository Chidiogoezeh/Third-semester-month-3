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
    link.className = "payment-action-button"; // Styled via CSS stylesheet
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
    setTimeout(() => {
      appendMessage(
        "Payment Successful! Your order status has been validated and confirmed.",
        "bot",
      );
      // Clean url parameters safely without triggering reload frame loops
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 1000);
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
