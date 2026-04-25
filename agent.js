import { createAgent } from "langchain";
import { AzureChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool } from "./tools.js";
import * as z from "zod";

const checkpointer = new MemorySaver();
const model = new AzureChatOpenAI({
  temperature: 0.1,
  maxTokens: 3300, 
});
// Stores the last chat messages per user for frontend history rendering.
const userHistories = new Map();
// Increments when reset is requested so each reset gets a fresh thread_id.
const threadVersionByUserId = new Map();

//tool response
const myToolResponse = z.object({
    message: z.string().describe("The message to the user"),
    toolsUsed: z.array(z.string()).describe("List with all the names of tools that were used in the response look at what other tools are being used, without the word function.")
});

function createRuntimeAgent(emailSettings) {
  // Build the send-email tool with this request's user settings.
  return createAgent({
    model,
    tools: [getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool(emailSettings)],
    responseFormat: myToolResponse,
    checkpointer,
    system: "You are a profesinal email assistent which always speaks in english, its very important that any and all emails you write and/or send match the users request and rely on the examples from the retrieve tool. If a mail requires planning you may the date tool the same aplies to weather if it implies a outside activity.",
  });
}

function getThreadId(userId) {
  // Compose a versioned thread id so reset can start a new memory thread.
  const version = threadVersionByUserId.get(userId) ?? 0;
  return `${userId}:${version}`;
}


// calling the agent
export async function callAgent( prompt, userId, emailSettings ) {
  // New agent instance ensures no cross-user credential leakage.
  const agent = createRuntimeAgent(emailSettings);
  // Keep a lightweight UI history separate from LangGraph's internal memory.
  const messages = userHistories.get(userId) ?? [];

  messages.push({ role: "user", content: prompt });

  const result = await agent.invoke(
    // The agent continues conversation based on the versioned thread id.
        { messages: [{ role: "user", content: prompt }] },
        { configurable: { thread_id: getThreadId(userId) } }
  )

  const assistantMessage = result?.structuredResponse?.message ?? "";
  messages.push({ role: "assistant", content: assistantMessage });
  // Save messages so /api/getHistory can return recent chat bubbles.
  userHistories.set(userId, messages);

  return result.structuredResponse;
}

export function getHistory(userId) {
  // Return a small, recent slice for fast frontend rendering.
    const messages = userHistories.get(userId) ?? [];

    return messages
    .slice(-10)
    .filter((m) => m.role !== "system")
}

export function resetUser(userId) {
  // Clear rendered history and advance thread version to reset agent context.
  userHistories.delete(userId);
  threadVersionByUserId.set(userId, (threadVersionByUserId.get(userId) ?? 0) + 1);
}
