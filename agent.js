import { createAgent, tool } from "langchain";
import { AzureChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool } from "./tools.js";
import * as z from "zod";

const checkpointer = new MemorySaver();
const model = new AzureChatOpenAI({
  temperature: 0.2,
  maxTokens: 3300, 
});
const userId = `appname-${crypto.randomUUID()}`;

//tool response
const myToolResponse = z.object({
    message: z.string().describe("The message to the user"),
    toolsUsed: z.array(z.string()).describe("List with names of tools used in the response, without the word function.")
});

function createRuntimeAgent(emailSettings) {
  // Build the send-email tool with this request's user settings.
  return createAgent({
    model,
    tools: [getWeather, rollDice, getCurrentDate, retrieve, createSendEmailTool(emailSettings)],
    responseFormat: myToolResponse,
    checkpointer,
    system: "You are a asssitent that always responds in english, you only use the date tool when the date is asked, the same counts for throwing a dice, the weather. you only use the retrieve tool when a fitting topic to a docuent is mentiond.",
  });
}


// calling the agent
export async function callAgent( prompt, userId, emailSettings ) {
  // New agent instance ensures no cross-user credential leakage.
  const agent = createRuntimeAgent(emailSettings);

  const result = await agent.invoke(
        { messages: [{ role: "user", content: prompt }] },
        { configurable: { thread_id: userId } }
  )

  return result.structuredResponse;
}
