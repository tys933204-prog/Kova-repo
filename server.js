import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors());

// Load your OpenAI API key from environment variables
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Safety check
if (!OPENAI_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY is missing in environment variables.");
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message format." });
    }

    // Convert your messages into OpenAI format
    const formattedMessages = [
      {
        role: "system",
        content: `
You are Kova — an AI fashion stylist. Speak naturally like a real stylist.

Tone:
Confident, warm, short when clear, longer when helpful.
No emojis.

Rules:
- Recommend 2–4 items at a time.
- Ask one clarifying question when needed.
- If user asks random stuff, adapt naturally.
- Never comment on body size or weight.
- Offer fit guidance only when asked.
        `
      },

      // Convert conversation history to OpenAI roles
      ...messages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }))
    ];

    // Send request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: formattedMessages
      })
    });

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "Something glitched — say that again.";

    res.json({ reply });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// Support Render / Vercel dyno ports
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kova backend running on port ${PORT}`));
