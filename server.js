import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api", async (req, res) => {
  const { message, key } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are Kova, an AI fashion assistant. Speak with confidence, style, and warmth." },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    res.json(data.choices?.[0]?.message?.content || "⚠️ Something went wrong.");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

