import { createAgent } from "langchain";
import { AzureChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool } from "./tools.js";
import * as z from "zod";

//memory saving for remembering previous chat and tool context
const checkpointer = new MemorySaver();

//the ai model
const model = new AzureChatOpenAI({
  temperature: 0.1,
  maxTokens: 3300, 
});

//system prompt about sending emails
const systemPrompt = `You are a profesional email sending
AI agent tool that helps users create and send emails. Always follow this order:

1. Ask the user what kind of email they would like to create and send (tone of voice, name from the sender, email of receiver,
name of receiver)
2. If the query is unclear and/or the user never shared the receivers email adress to send the email to, ask for clarification
first
3. Search the knowledge base with RAG for email examples
4. check if other tools are required to perform the task like if it includes planning check the date tool and if it includes a outside activity check the weather at the given location.
5. share the email output first to the user to obtain explicit approval from the user to send that email
6. If approval was not given apply corrections based on user feedback
7. if user feedback en approval has not been given ask for feedback
8. if user gives approval send it, and clarify in the chat it has done so`;


//stores the last chat messages per user for frontend history rendering.
const userHistories = new Map();
//increments when reset is requested so each reset gets a fresh thread_id.
const threadVersionByUserId = new Map();

//tool response
const myToolResponse = z.object({
    message: z.string().describe("The message to the user"),
    toolsUsed: z.array(z.string()).describe("List with all the names of tools that were used in the response look at what other tools are being used, without the word function.")
});

//agent with the tools, previous chat and tool usage information + system prompt
function createRuntimeAgent(emailSettings) {
  //build the send-email tool with this request's user settings.
  return createAgent({
    model,
    tools: [getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool(emailSettings)],
    responseFormat: myToolResponse,
    checkpointer,
    systemPrompt,
  });
}

function getThreadId(userId) {
  //compose a versioned thread id so reset can start a new memory thread.
  const version = threadVersionByUserId.get(userId) ?? 0;
  return `${userId}:${version}`;
}


//calling the agent
export async function callAgent( prompt, userId, emailSettings ) {
  //new agent instance ensures no cross-user credential leakage.
  const agent = createRuntimeAgent(emailSettings);
  //keep a lightweight UI history separate from LangGraph's internal memory.
  const messages = userHistories.get(userId) ?? [];

  messages.push({ role: "user", content: prompt });

  const result = await agent.invoke(
    //the agent continues conversation based on the versioned thread id.
        { messages: [{ role: "user", content: prompt }] },
        { configurable: { thread_id: getThreadId(userId) } }
  )

  const assistantMessage = result?.structuredResponse?.message ?? "";
  messages.push({ role: "assistant", content: assistantMessage });
  //save messages so /api/getHistory can return recent chat bubbles.
  userHistories.set(userId, messages);

  return result.structuredResponse;
}

export function getHistory(userId) {
  //return a small, recent slice for fast frontend rendering.
    const messages = userHistories.get(userId) ?? [];

    return messages
    .slice(-10)
    .filter((m) => m.role !== "system")
}

export function resetUser(userId) {
  //clear rendered history and advance thread version to reset agent context.
  userHistories.delete(userId);
  threadVersionByUserId.set(userId, (threadVersionByUserId.get(userId) ?? 0) + 1);
}
