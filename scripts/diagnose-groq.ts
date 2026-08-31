import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";

async function checkGroqModels() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY não encontrada no .env.local");
    return;
  }

  const groq = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  try {
    console.log("🔍 Consultando modelos disponíveis na sua chave da Groq...");
    const modelsList = await groq.models.list();
    const modelIds = modelsList.data.map((m) => m.id);
    console.log("✅ Modelos ativos encontrados:");
    console.log(modelIds);
  } catch (err) {
    console.error("❌ Erro ao consultar Groq:", err);
  }
}

checkGroqModels();