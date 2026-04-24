import {micromark} from 'https://esm.sh/micromark@3?bundle'

// client app.js
const btn = document.querySelector("#chatSendBtn")
const input = document.querySelector("#input")
const chatDiv = document.querySelector(".chat")
const scoreDiv = document.querySelector(".score")
const resetBtn = document.querySelector("#reset")
const emailSettingsForm = document.querySelector("#emailSettingsForm")
const smtpUserInput = document.querySelector("#smtpUser")
const smtpPassInput = document.querySelector("#smtpPass")
const emailFromInput = document.querySelector("#emailFrom")
const settingsStatus = document.querySelector("#settingsStatus")
let userId = localStorage.getItem("userid");

if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userid", userId);
}

const storedEmailSettings = JSON.parse(localStorage.getItem("emailSettings") || "null");
if (storedEmailSettings) {
  // Pre-fill the settings form from browser storage.
  smtpUserInput.value = storedEmailSettings.smtpUser || "";
  smtpPassInput.value = storedEmailSettings.smtpPass || "";
  emailFromInput.value = storedEmailSettings.emailFrom || "";
  // Re-send to backend after reload because backend storage is in-memory.
  saveEmailSettings(storedEmailSettings).catch((error) => {
    console.error("Could not re-sync saved email settings:", error);
  });
}


console.log("starting frontend")

emailSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const smtpUser = smtpUserInput.value.trim();
  const smtpPass = smtpPassInput.value.trim();
  const emailFrom = emailFromInput.value.trim();

  if (!smtpUser || !smtpPass || !emailFrom) {
    settingsStatus.textContent = "Please fill all email settings fields.";
    return;
  }

  settingsStatus.textContent = "Saving...";

  try {
    await saveEmailSettings({ smtpUser, smtpPass, emailFrom });
    localStorage.setItem("emailSettings", JSON.stringify({ smtpUser, smtpPass, emailFrom }));
    settingsStatus.textContent = "Email settings saved.";
  } catch (error) {
    settingsStatus.textContent = "Could not save settings.";
    console.error(error);
  }
})

async function saveEmailSettings({ smtpUser, smtpPass, emailFrom }) {
  // Backend stores these settings under the current userId.
  const response = await fetch("/api/email-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, smtpUser, smtpPass, emailFrom })
  });

  if (!response.ok) {
    throw new Error("Failed to save email settings.");
  }
}

async function loadHistory() {
  try {
    const res = await fetch("/api/getHistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      throw new Error("Failed to load history.");
    }

    const history = await res.json();

    history.forEach((msg) => {
      if (msg.role === "user") {
        addMessage("user", msg.content ?? "");
      }

      if (msg.role === "assistant" || msg.role === "ai") {
        addMessage("assistant", msg.content ?? "");
      }
    });
  } catch (error) {
    console.error("Could not load chat history:", error);
  }
}


btn.addEventListener("click", async (e) => {
  //prevent reload
  e.preventDefault() 
  
  const prompt = input.value.trim()
  if (!prompt) return

  addMessage("user", prompt)
  input.value = ""
  btn.disabled = true
  if (resetBtn) {
    resetBtn.disabled = true
  }

  try {
    //get data
    const data = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, prompt })
    })

    //save data
    const result = await data.json()


    console.log(result.tokens)

    scoreDiv.textContent = `Agent Response`  
   
    addAssistantMessage(result.message, result.toolsUsed ?? []);

  } catch (error) {
    addMessage("assistant", "````_something went wrong_````")
    console.error(error)
  } finally {
    btn.disabled = false
    if (resetBtn) {
      resetBtn.disabled = false
    }
  }
})


function addMessage(type, text) {
  const message = document.createElement("div")
  message.className = `message ${type}`
  //console.log(text)

  const converted = micromark(text)
  //console.log(converted)

  message.innerHTML = converted

  chatDiv.appendChild(message)
  chatDiv.scrollTop = chatDiv.scrollHeight
  return message
}

function addAssistantMessage(text, toolsUsed) {
  const bubble = document.createElement("div");
  bubble.className = "message assistant";

  const content = document.createElement("div");
  content.className = "assistant-content";
  content.innerHTML = micromark(text);

  const tools = document.createElement("div");
  tools.className = "assistant-tools";
  tools.textContent = "Tools used: " + (toolsUsed.join(", ") || "none");

  bubble.appendChild(content);
  bubble.appendChild(tools);

  chatDiv.appendChild(bubble);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    btn.disabled = true
    resetBtn.disabled = true

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error("Failed to reset chat.");
      }

      chatDiv.innerHTML = "";
    } catch (error) {
      addMessage("assistant", "````_something went wrong while resetting_````")
      console.error(error)
    } finally {
      btn.disabled = false
      resetBtn.disabled = false
    }
  })
}

loadHistory()




