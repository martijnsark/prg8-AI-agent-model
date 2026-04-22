import {micromark} from 'https://esm.sh/micromark@3?bundle'

// client app.js
const btn = document.querySelector("button")
const input = document.querySelector("#input")
const chatDiv = document.querySelector(".chat")
const scoreDiv = document.querySelector(".score")
let userId = localStorage.getItem("userid");

if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userid", userId);
}


console.log("starting frontend")


btn.addEventListener("click", async (e) => {
  //prevent reload
  e.preventDefault() 
  
  const prompt = input.value.trim()
  if (!prompt) return

  addMessage("user", prompt)
  input.value = ""
  btn.disabled = true

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
    // inside try block, replace current assistant addMessage call:
    addAssistantMessage(result.message, result.toolsUsed ?? []);

  } catch (error) {
    addMessage("assistant", "````_something went wrong_````")
    console.error(error)
  } finally {
    btn.disabled = false
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




