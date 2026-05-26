const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const sessions = new Map();

const SYSTEM_PROMPT = `You are the dungeon master of a dark fantasy text adventure. Generate immersive, atmospheric story scenes and meaningful choices.

Always respond with ONLY valid JSON (no markdown, no backticks, no extra text) in this exact format:
{
  "scene": "2-4 sentences of vivid narrative. Make it immersive and literary.",
  "eventType": "explore|combat|story|loot",
  "location": "short location name (max 4 words)",
  "hpChange": 0,
  "xpGain": 0,
  "choices": [
    {"label": "Short action (max 8 words)"},
    {"label": "Short action (max 8 words)"},
    {"label": "Short action (max 8 words)"}
  ]
}
Rules:
- hpChange: negative for damage (-1 to -3), positive for healing (+1 to +2), 0 for neutral
- xpGain: 0-5 based on significance of the event
- Always give exactly 3 choices
- Keep the story dark, mysterious, and engaging
- Reference the player character class in your narrative
- Build a coherent story arc across turns`;

async function callGroq(messages) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.85,
    max_tokens: 600,
  });
  const raw = completion.choices[0].message.content.trim();
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function startGame(req, res) {
  try {
    const { characterClass } = req.body;
    if (!characterClass)
      return res.status(400).json({ error: "characterClass is required" });

    const openingPrompt = `Begin the adventure. The player is a ${characterClass} entering a dark and mysterious world. Set the opening scene.`;
    const data = await callGroq([{ role: "user", content: openingPrompt }]);

    const sessionId = generateId();
    sessions.set(sessionId, {
      characterClass,
      hp: 10,
      maxHp: 10,
      xp: 0,
      location: data.location || "The Dark Forest",
      isAlive: true,
      history: [
        { role: "user", content: openingPrompt },
        { role: "assistant", content: JSON.stringify(data) },
      ],
    });

    res.json({ sessionId, ...data });
  } catch (err) {
    console.error("startGame error:", err);
    res
      .status(500)
      .json({ error: "Failed to start game", details: err.message });
  }
}

async function sendAction(req, res) {
  try {
    const { sessionId, action } = req.body;
    if (!sessionId || !action)
      return res
        .status(400)
        .json({ error: "sessionId and action are required" });

    const session = sessions.get(sessionId);
    if (!session)
      return res
        .status(404)
        .json({ error: "Session not found. Please start a new game." });
    if (!session.isAlive)
      return res
        .status(400)
        .json({ error: "This character is dead. Start a new game." });

    const history = [
      ...session.history.slice(-16),
      { role: "user", content: action },
    ];
    const data = await callGroq(history);

    session.hp = Math.max(
      0,
      Math.min(session.maxHp, session.hp + (data.hpChange || 0)),
    );
    session.xp += data.xpGain || 0;
    session.location = data.location || session.location;
    session.isAlive = session.hp > 0;
    session.history.push({ role: "user", content: action });
    session.history.push({ role: "assistant", content: JSON.stringify(data) });

    res.json({
      ...data,
      hp: session.hp,
      maxHp: session.maxHp,
      xp: session.xp,
      isAlive: session.isAlive,
    });
  } catch (err) {
    console.error("sendAction error:", err);
    res
      .status(500)
      .json({ error: "Failed to process action", details: err.message });
  }
}

module.exports = { startGame, sendAction };
