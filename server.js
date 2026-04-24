import express from "express"
import { callAgent } from "./agent.js"

const app = express()
app.use(express.json())
app.use(express.static("public"))

// In-memory runtime settings keyed by frontend userId.
const emailSettingsByUserId = new Map();

app.post("/api/email-settings", (req, res) => {
  const { userId, smtpUser, smtpPass, emailFrom } = req.body ?? {};

  if (!userId || !smtpUser || !smtpPass || !emailFrom) {
    return res.status(400).json({ error: "Missing required email settings." });
  }

  // Save only the three user-managed email fields.
  emailSettingsByUserId.set(userId, { smtpUser, smtpPass, emailFrom });
  return res.json({ success: true });
})

app.post("/api/chat", async(req,res) => {
  const { prompt, userId } = req.body;
  console.log(prompt, userId)
  // Use email settings for this user when the agent invokes send_email.
  const emailSettings = emailSettingsByUserId.get(userId);
  const response = await callAgent(prompt, userId, emailSettings)
  res.json(response);
})

app.listen(3000, ()=> console.log("started on localhost:3000"))