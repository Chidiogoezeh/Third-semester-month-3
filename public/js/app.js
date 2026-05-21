import { sendMessage, onMessage, socket } from "./socket-client.js";

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

const initializeSession = () => {
  let id = localStorage.getItem("bot_session");
  const isValidUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (id && id.startsWith("sess_")) {
    const rawUuid = id.substring(5);
    if (!isValidUuid.test(rawUuid)) id = null;
  } else {
    id = null;
  }

  if (!id) {
    id = `sess_${crypto.randomUUID()}`;
    localStorage.setItem("bot_session", id);
  }
  return id;
};

const sessionId = initializeSession();

const createTextParagraph = (text) => {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
};

const createMessageElement = (text, sender) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender === "user" ? "user-msg" : "bot-msg");

  if (text.startsWith("PAY_LINK|")) {
    const [, url] = text.split("|");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_self";
    link.rel = "noopener noreferrer";
    link.textContent = "Click here to securely pay via Paystack";
    link.classList.add("payment-action-button");
    msgDiv.appendChild(link);
  } else {
    text.split("\n").forEach((line) => {
      if (line.trim()) msgDiv.appendChild(createTextParagraph(line));
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
  if (data?.text) appendMessage(data.text, "bot");
});

if (socket) {
  socket.on("connect", () => {
    sendMessage("join-chat", { sessionId });

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const sessionToken = urlParams.get("sess");

    if (paymentStatus === "success") {
      // Send a dedicated text command or re-query string to bypass or gracefully force state evaluation
      sendMessage("user-selection", {
        sessionId: sessionToken || sessionId,
        selection: "9",
      });
    } else if (paymentStatus === "failed") {
      appendMessage(
        "Payment tracking verification failed. Please try again from option 99.",
        "bot",
      );
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  });
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rawInput = userInput.value.trim();
  if (!rawInput) return;

  appendMessage(rawInput, "user");
  sendMessage("user-selection", { sessionId, selection: rawInput });
  userInput.value = "";
});
