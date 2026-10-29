const $ = (selector) => document.querySelector(selector);

const form = $("#pairForm");
const phoneInput = $("#phone");
const pairButton = $("#pairButton");
const buttonText = $("#buttonText");
const messageBox = $("#messageBox");
const codePanel = $("#codePanel");
const pairCode = $("#pairCode");
const copyButton = $("#copyButton");

const systemStatus = $("#systemStatus");
const connectionTitle = $("#connectionTitle");
const connectionDescription = $("#connectionDescription");
const connectionBadge = $("#connectionBadge");

let requestInProgress = false;

/* Floating background particles */
(function createParticles() {
  const container = $("#particles");
  const total = window.innerWidth < 600 ? 18 : 34;

  for (let i = 0; i < total; i++) {
    const particle = document.createElement("span");

    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${7 + Math.random() * 13}s`;
    particle.style.animationDelay = `${Math.random() * 12}s`;

    const size = 1 + Math.random() * 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    container.appendChild(particle);
  }
})();

function showMessage(message, type = "") {
  messageBox.textContent = message;
  messageBox.className = `message-box ${type}`.trim();
  messageBox.hidden = false;
}

function setConnection(title, description, badge) {
  connectionTitle.textContent = title;
  connectionDescription.textContent = description;
  connectionBadge.textContent = badge;
}

function setLoading(loading) {
  requestInProgress = loading;
  pairButton.disabled = loading;
  buttonText.textContent = loading
    ? "REQUESTING CONNECTION..."
    : "GENERATE PAIRING CODE";

  systemStatus.textContent = loading
    ? "INITIALIZING LINK"
    : "SYSTEM READY";

  connectionBadge.textContent = loading ? "WAIT" : "IDLE";
}

/*
 * Backend contract:
 * POST /api/pair
 * JSON body: { "phone": "923001234567" }
 *
 * Expected success response:
 * { "code": "ABCD-EFGH" }
 *
 * The backend must generate a real Baileys pairing code.
 */
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (requestInProgress) return;

  const phone = phoneInput.value.replace(/\D/g, "");

  if (phone.length < 8 || phone.length > 15) {
    showMessage(
      "Please enter a valid international phone number, including your country code.",
      "error"
    );
    phoneInput.focus();
    return;
  }

  codePanel.hidden = true;
  messageBox.hidden = true;
  setLoading(true);

  setConnection(
    "Contacting pairing service",
    "Waiting for the server response...",
    "WAIT"
  );

  try {
    const response = await fetch("/api/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "The pairing server rejected the request."
      );
    }

    if (!data.code || typeof data.code !== "string") {
      throw new Error(
        "The server did not return a pairing code. Check the backend implementation."
      );
    }

    pairCode.textContent = data.code;
    codePanel.hidden = false;

    showMessage(
      "Pairing code generated. Enter it in WhatsApp Linked Devices.",
      "success"
    );

    setConnection(
      "Pairing code generated",
      "Complete the process in WhatsApp.",
      "CODE READY"
    );

    systemStatus.textContent = "PAIRING READY";
  } catch (error) {
    const message =
      error.name === "TimeoutError"
        ? "The pairing server took too long to respond. Please try again."
        : error.message === "Failed to fetch"
          ? "Pairing backend is not connected yet. The website design is ready, but the server endpoint must be implemented."
          : error.message || "Unable to generate the pairing code.";

    showMessage(message, "error");

    setConnection(
      "Pairing unavailable",
      "Check the backend server and try again.",
      "OFFLINE"
    );

    systemStatus.textContent = "BACKEND CHECK";
  } finally {
    setLoading(false);
  }
});

/* Copy the real code returned by the backend */
copyButton.addEventListener("click", async () => {
  const code = pairCode.textContent.trim();

  if (!code || code === "----") return;

  try {
    await navigator.clipboard.writeText(code);
    copyButton.textContent = "✓ CODE COPIED";

    setTimeout(() => {
      copyButton.textContent = "▣ COPY PAIRING CODE";
    }, 1800);
  } catch {
    showMessage(
      "Automatic copying is unavailable. Select and copy the code manually.",
      "error"
    );
  }
});

/* Allow only digits in the phone number field */
phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "");
});

/* Initial interface state */
setConnection(
  "Awaiting authentication",
  "Ready to initiate pairing",
  "IDLE"
);
