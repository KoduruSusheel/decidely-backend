import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Decidely backend is running 🚀");
});

app.post("/api/decision-frame", async (req, res) => {
  try {
    const { problem } = req.body;

    if (!problem) {
      return res.status(400).json({
        error: "Problem statement is required"
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: `Problem: "${problem}"

TASK:

1. Identify 3–5 reasonable decision OPTIONS.

2. Identify 5–8 DECISION FACTORS.

3. Assign suggested importance weights (1–10).

4. Score each option against every factor from 1–10.

5. Provide short explanation for factors.

IMPORTANT RULES:

- Do NOT choose the best option.
- Do NOT recommend any option.
- Only structure the decision.

Return JSON STRICTLY in this format:

{
  "options": ["Option A", "Option B"],
  "factors": [
    {
      "name": "Cost",
      "suggested_weight": 8,
      "why_it_matters": "Cost affects affordability."
    }
  ],
  "scores": {
    "Option A": {
      "Cost": 7
    },
    "Option B": {
      "Cost": 5
    }
  },
  "disclaimer": "Final decisions remain with the user."
}`
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("Full Groq Response:");
    console.log(JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        error: "Invalid response from AI",
        raw: data
      });
    }

    let content = data.choices[0].message.content;

    if (!content) {
      return res.status(500).json({
        error: "AI returned empty content",
        raw: data
      });
    }

    // Remove markdown formatting if AI adds it
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        error: "Failed to parse AI JSON",
        raw: content
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("Server Error:", error);

    res.status(500).json({
      error: "AI processing failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Decidely backend running on port ${PORT}`);
});