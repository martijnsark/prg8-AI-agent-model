import express from "express"
import { callAgent } from "./agent.js"

const app = express()
app.use(express.json())
app.use(express.static("public"))

app.post("/api/chat", async(req,res) => {
  const { prompt, userId } = req.body;
  console.log(prompt, userId)
  const response = await callAgent(prompt, userId)
  res.json(response);
})

app.listen(3000, ()=> console.log("started on localhost:3000"))