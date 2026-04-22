import {createAgent, tool } from "langchain";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";


const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
});

const vectorStore = await FaissStore.load("./documents", embeddings);
console.log("✅ vector store loaded!")


//weather tool
export const getWeather = tool(
  async ({ city }) => {
    console.log("🔧 The weather tool is being applied!");

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=nl`;
    const response = await fetch(url);

    const data = await response.json();
    const temp = data?.main?.temp;
    const feelsLike = data?.main?.feels_like;
    const humidity = data?.main?.humidity;
    const wind = data?.wind?.speed;
    const description = data?.weather?.[0]?.description;

    return `Current weather in ${data.name}: ${description}, ${temp}°C (feels like ${feelsLike}°C), humidity ${humidity}%, wind ${wind} m/s.`;
  },
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: {
      type: "object",
      properties: {
        city: { type: "string" },
      },
      required: ["city"],
    },
  },
);



//dice tool
export const rollDice = tool(
  async ({ sides }) => {
    console.log(`🔧 I'm throwing a ${sides}-sided dice!`);
    const result = Math.floor(Math.random() * sides) + 1;
    return `Je gooide een ${result}!`;
  },
  {
    name: "roll_dice",
    description: "Throw a dice with a given ammount of sides.",
    schema: {
      type: "object",
      properties: {
        sides: { type: "number" },
      },
      required: ["sides"],
    },
  }
);
  


//date tool
export const getCurrentDate = tool(
  async () => {
    console.log("🔧 date-tool is being applied!");

    const today = new Date();
    const readableDate = today.toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `Vandaag is het ${readableDate}.`;
  },
  {
    name: "get_current_date",
    description: "Give the current date in a readable dutch format.",
    schema: {
      type: "object",
      properties: {},
      required: [],
    },
  }
);



//document search tool
export const retrieve = tool(
  async ({ query }) => {
    console.log("🔧 now searching the document store")
    const relevantDocs = await vectorStore.similaritySearch(query, 2);

    // Log only unique file names
    const fileNames = [...new Set(
      relevantDocs.map((doc) =>
        (doc.metadata?.source || "unknown").split(/[\\/]/).pop()
      )
    )];
    console.log("Matched files:", fileNames);

    const context = relevantDocs.map((r) => r.pageContent).join("\n\n");
    return context
  },
  {
    name: "retrieve",
    description: "Retrieve information related to javasscript code from example.txt, ecology from ecology.pdf, and history from history-matters.pdf",
    schema: {
        "type": "object",
        "properties": { "query": { "type": "string" } },
        "required": ["query"]
    }
  }
)