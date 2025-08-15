import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is not set!");
  process.exit(1);
}

const ai = new GoogleGenAI({ 
  apikey: process.env.GEMINI_API_KEY,
  verbose: true // Aktifkan logging verbose
});

// Gunakan model yang lebih stabil
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server Running on http://localhost:${PORT}!`));

// Fungsi ekstraksi teks
function extractText(resp) {
  try {
    // Coba beberapa struktur respons yang mungkin
    if (resp.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return resp.response.candidates[0].content.parts[0].text;
    }
    if (resp.candidates?.[0]?.content?.parts?.[0]?.text) {
      return resp.candidates[0].content.parts[0].text;
    }
    if (resp.response?.text) {
      return resp.response.text();
    }
    if (resp.text) {
      return resp.text();
    }
    
    console.error("Cannot extract text from response:", JSON.stringify(resp, null, 2));
    return "I'm having trouble understanding that. Could you try again?";
  } catch (err) {
    console.error("Error extracting text", err);
    return "Sorry, I encountered an error processing your request.";
  }
}

// API CHAT
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages must be an array" });
    }

    // Konversi pesan ke format Gemini dengan role yang benar
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

        // Tambahkan instruksi format ke prompt terakhir
    if (contents.length > 0) {
      const lastMessage = contents[contents.length - 1].parts[0].text;
      contents[contents.length - 1].parts[0].text = 
        `${lastMessage}\n\nHarap berikan respons dengan format yang rapi:\n` +
        `- Gunakan paragraf pendek\n` +
        `- Gunakan bullet points untuk poin-poin penting\n` +
        `- Bold untuk judul poin\n` +
        `- Jangan gunakan markdown, cukup teks biasa dengan format sederhana`;
    }

    console.log(`[${new Date().toISOString()}] Sending to Gemini:`, JSON.stringify({ contents }, null, 2));

    const resp = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });

    const resultText = extractText(resp);
    console.log(`[${new Date().toISOString()}] Received from Gemini:`, resultText);
    
    res.json({ result: resultText });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /api/chat:`, err);
    res.status(500).json({ 
      error: err.message || "Internal server error",
      details: err.response?.data || err.stack
    });
  }
});