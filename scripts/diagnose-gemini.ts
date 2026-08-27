import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

async function checkModels() {
  console.log("🔍 Verificando modelos disponíveis para sua chave...");
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY não encontrada no .env.local");
    return;
  }

  // 1. Testa a lista oficial de modelos via REST API direta do Google
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (data.error) {
      console.error("❌ Erro da API Google:", data.error.message);
      return;
    }

    const available = data.models
      ?.filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""));

    console.log("✅ Modelos suportados encontrados:");
    console.log(available);
  } catch (err) {
    console.error("❌ Falha na requisição:", err);
  }
}

checkModels();