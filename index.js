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


/* -----------------------------------------------------
   1️⃣ INITIAL DECISION FRAME GENERATION
----------------------------------------------------- */

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
              content: `
You are Decidely — a neutral decision framing assistant.

Your job is NOT to decide for the user.
Your job is to help the user structure their thinking.

Return ONLY valid JSON.
No markdown.
No explanations outside JSON.
`
            },
            {
              role: "user",
              content: `
Problem: "${problem}"

TASK:

1. Identify 3–5 reasonable decision OPTIONS.

2. Identify 3–4 DECISION FACTORS.

3. Assign suggested importance weights (1–10).

4. Score each option against every factor from 1–10.

5. Provide short explanation for factors.

IMPORTANT RULES:

- Do NOT recommend any option.
- Do NOT choose the best option.
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
}
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        error: "Invalid AI response",
        raw: data
      });
    }

    let content = data.choices[0].message.content;

    if (!content) {
      return res.status(500).json({
        error: "AI returned empty content"
      });
    }

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
    console.error("Decision Frame Error:", error);

    res.status(500).json({
      error: "AI processing failed"
    });
  }
});


/* -----------------------------------------------------
   2️⃣ AI SCORE GENERATION FOR NEW OPTIONS / FACTORS
----------------------------------------------------- */

app.post("/api/score-entries", async (req, res) => {
  try {
    const { problem, allOptions, allFactors } = req.body;

    if (!problem || !allOptions || !allFactors) {
      return res.status(400).json({
        error: "problem, allOptions, and allFactors are required"
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
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `
You are an AI decision analysis engine.

Your job is to evaluate how well each option satisfies each factor.

Scores must be between 1 and 10.

Scores should vary logically depending on trade-offs.

Avoid assigning the same score to everything.

Ensure different options perform better on some factors and worse on others.

Return ONLY JSON.
`
            },
            {
              role: "user",
              content: `
Problem:
${problem}

Options:
${JSON.stringify(allOptions)}

Factors:
${JSON.stringify(allFactors)}

TASK:

Score each option against each factor from 1–10.

Return JSON EXACTLY in this format:

{
  "scores": {
    "Option A": {
      "Factor 1": 7,
      "Factor 2": 4
    },
    "Option B": {
      "Factor 1": 5,
      "Factor 2": 9
    }
  }
}
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "AI returned empty response"
      });
    }

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
    console.error("Score Entries Error:", error);

    res.status(500).json({
      error: "AI scoring failed"
    });
  }
});


/* -----------------------------------------------------
   SERVER START
----------------------------------------------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Decidely backend running on port ${PORT}`);
});