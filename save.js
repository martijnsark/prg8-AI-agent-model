import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";



// 1. Load document
//const loader = new TextLoader("./public/originals/example.txt");
const loader = new DirectoryLoader("./public/originals", {
  ".txt": (path) => new TextLoader(path),
  ".pdf": (path) => new PDFLoader(path),
});
const docs = await loader.load();

// 2. Split
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const chunks = await textSplitter.splitDocuments(docs);

// 3. Embeddings
const embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIApiEmbeddingsDeploymentName:
  process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
});

// 4. Create FAISS vector store
const vectorStore = await FaissStore.fromDocuments(chunks, embeddings);

// 5. Save it to disk
await vectorStore.save("./documents");

console.log("✅ vector store saved!");