import socket, { sendMessage, onMessage } from "./socket-client.js";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

// Persistence using localStorage for device session
let sessionId =
  localStorage.getItem("bot_session") ||
  "sess_" + Math.random().toString(36).substr(2, 9);
localStorage.setItem("bot_session", sessionId);

const createMessageElement = (text, sender) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);
  const content = document.createElement("p");
  content.textContent = text;
  msgDiv.appendChild(content);
  return msgDiv;
};

const appendMessage = (text, sender) => {
  const msg = createMessageElement(text, sender);
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

// Handle Incoming Bot Messages
onMessage("bot-response", (data) => {
  appendMessage(data.text, "bot");
});

// Initial Welcome Message
window.addEventListener("DOMContentLoaded", () => {
  sendMessage("join-chat", { sessionId });
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  sendMessage("user-selection", { sessionId, selection: message });
  userInput.value = "";
});
