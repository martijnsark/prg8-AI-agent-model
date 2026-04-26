import { micromark } from "https://esm.sh/micromark@3?bundle"

//DOM references used across chat and settings interactions.
const sendButton = document.querySelector("#chatSendBtn")
const promptInput = document.querySelector("#input")
const chatContainer = document.querySelector(".chat")
const scoreDiv = document.querySelector(".score")
const resetButton = document.querySelector("#reset")

const emailSettingsForm = document.querySelector("#emailSettingsForm")
const smtpUserInput = document.querySelector("#smtpUser")
const smtpPassInput = document.querySelector("#smtpPass")
const emailFromInput = document.querySelector("#emailFrom")
const settingsStatus = document.querySelector("#settingsStatus")

//variables for userid and email login
const USER_ID_KEY = "userid"
const EMAIL_SETTINGS_KEY = "emailSettings"

//keep one stable client id so backend can store per-user runtime state.
let userId = localStorage.getItem(USER_ID_KEY)
if (!userId) {
  userId = crypto.randomUUID()
  localStorage.setItem(USER_ID_KEY, userId)
}


//start loading other functions
initializeApp()



//load other functions
function initializeApp() {
  restoreAndSyncEmailSettings()

  emailSettingsForm.addEventListener("submit", handleEmailSettingsSubmit)
  sendButton.addEventListener("click", handleSendClick)

  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick)
  }

  loadHistory()
}



//load previous saved email login details
function restoreAndSyncEmailSettings() {
  //restore saved settings in the form and sync them back to the backend on reload.
  const storedEmailSettings = JSON.parse(localStorage.getItem(EMAIL_SETTINGS_KEY) || "null")
  if (!storedEmailSettings) return

  smtpUserInput.value = storedEmailSettings.smtpUser || ""
  smtpPassInput.value = storedEmailSettings.smtpPass || ""
  emailFromInput.value = storedEmailSettings.emailFrom || ""

  saveEmailSettings(storedEmailSettings).catch((error) => {
    console.error("Could not re-sync saved email settings:", error)
  })
}



//submit email information
async function handleEmailSettingsSubmit(event) {
  event.preventDefault()

  const smtpUser = smtpUserInput.value.trim()
  const smtpPass = smtpPassInput.value.trim()
  const emailFrom = emailFromInput.value.trim()

  if (!smtpUser || !smtpPass || !emailFrom) {
    settingsStatus.textContent = "Please fill all email settings fields."
    return
  }

  settingsStatus.textContent = "Saving..."

  try {
    const settings = { smtpUser, smtpPass, emailFrom }
    await saveEmailSettings(settings)
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings))
    settingsStatus.textContent = "Email settings saved."
  } catch (error) {
    settingsStatus.textContent = "Could not save settings."
    console.error(error)
  }
}



//send prompt
async function handleSendClick(event) {
  event.preventDefault()

  const prompt = promptInput.value.trim()
  if (!prompt) return

  addMessage("user", prompt)
  promptInput.value = ""
  setChatButtonsDisabled(true)

  try {
    //chat endpoint returns structured assistant output with used tools.
    const result = await postJson("/api/chat", { userId, prompt })
    scoreDiv.textContent = "Agent Response"
    addAssistantMessage(result.message, result.toolsUsed ?? [])
  } catch (error) {
    addMessage("assistant", "_Something went wrong._")
    console.error(error)
  } finally {
    setChatButtonsDisabled(false)
  }
}



//reset chat history 
async function handleResetClick() {
  setChatButtonsDisabled(true)

  try {
    await postJson("/api/reset", { userId })
    chatContainer.innerHTML = ""
  } catch (error) {
    addMessage("assistant", "_Something went wrong while resetting._")
    console.error(error)
  } finally {
    setChatButtonsDisabled(false)
  }
}



//disable buttons
function setChatButtonsDisabled(isDisabled) {
  sendButton.disabled = isDisabled
  if (resetButton) {
    resetButton.disabled = isDisabled
  }
}




async function postJson(url, payload) {
  //centralized JSON POST helper keeps endpoint calls consistent.
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`)
  }

  return response.json()
}



//save email login
async function saveEmailSettings({ smtpUser, smtpPass, emailFrom }) {
  await postJson("/api/email-settings", { userId, smtpUser, smtpPass, emailFrom })
}



//load previous chat messages
async function loadHistory() {
  try {
    //rebuild chat UI from server-side history for the current user id.
    const history = await postJson("/api/getHistory", { userId })

    history.forEach((msg) => {
      if (msg.role === "user") {
        addMessage("user", msg.content ?? "")
      }

      if (msg.role === "assistant" || msg.role === "ai") {
        addMessage("assistant", msg.content ?? "")
      }
    })
  } catch (error) {
    console.error("Could not load chat history:", error)
  }
}




//create html element for user chat messages
function addMessage(type, text) {
  const message = document.createElement("div")
  message.className = `message ${type}`
  //markdown support keeps bot output readable without manual HTML building.
  message.innerHTML = micromark(text)

  chatContainer.appendChild(message)
  chatContainer.scrollTop = chatContainer.scrollHeight
  return message
}



//create html element for ai agent chat messages
function addAssistantMessage(text, toolsUsed) {
  const bubble = document.createElement("div")
  bubble.className = "message assistant"

  const content = document.createElement("div")
  content.className = "assistant-content"
  content.innerHTML = micromark(text)

  const tools = document.createElement("div")
  tools.className = "assistant-tools"
  tools.textContent = "Tools used: " + (toolsUsed.join(", ") || "none")

  bubble.appendChild(content)
  bubble.appendChild(tools)
  chatContainer.appendChild(bubble)
  chatContainer.scrollTop = chatContainer.scrollHeight
}




